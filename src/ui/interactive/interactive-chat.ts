import { ShellState } from './shell-state.js';
import { ChatSession } from './chat-session.js';
import { createProviderRouter } from '../../providers/router.js';
import { buildProjectContext, formatProjectContextForPrompt } from '../../core/context-builder.js';
import { resolveModelProfile, resolveProviderConfig } from '../../config/loader.js';
import type { ChatMessage, ModelProfile } from '../../providers/types';
import type { NeedleConfig } from '../../config/schema.js';
import { TaskNormalizer } from './task-normalizer.js';
import { ReferenceResolver } from './reference-resolver.js';
import { runAgentLoop } from '../../core/agent-loop.js';
import { runPlanMode } from '../../planner/plan-mode.js';
import * as readline from 'node:readline';
import { runCodeAction } from './code-action-runner.js';
import { runDocumentation } from './documentation-runner.js';
import { SessionState } from './session-state.js';

const runtimeSessionState = new SessionState();
const normalizer = new TaskNormalizer();
const resolver = new ReferenceResolver(runtimeSessionState.toolObservations);

const SYSTEM_PROMPT = `You are Needle, an AI coding CLI assistant.
Help with software engineering, project analysis, planning, debugging, and safe coding workflows.
You are inside an interactive terminal session.
When answering questions or analyzing the workspace, provide detailed, helpful, and natural explanations. Do not answer with one tiny compressed paragraph unless explicitly asked for a short answer.
For code changes, suggest using /plan or /code.
Do not claim to have modified files unless a tool workflow was explicitly run. NEVER claim you created, edited, or deleted files unless the tool workflow actually ran.
IMPORTANT: When asked about recent changes, created files/folders, or "mana filenya?", you MUST ground your answer purely on the "Recent Tool Observations from this Session" provided below. If it's not in the observations, admit you don't know or didn't create it.`;

export async function handleInteractiveChat(
  input: string,
  state: ShellState,
  chatSession: ChatSession,
  rl?: readline.Interface
): Promise<void> {
  const red = '\x1b[31m';
  const reset = '\x1b[0m';

  if (!state.config) {
    console.log('Needle is not configured yet.\nRun /settings to connect a provider and model.');
    return;
  }
  const config = state.config;

  const router = createProviderRouter(config);

  // Find a usable profile
  let targetProfile: ModelProfile | undefined;
  const profiles: ModelProfile[] = ['smart', 'coder', 'fast'];
  for (const p of profiles) {
    try {
      if (config.models[p]) {
        targetProfile = p;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!targetProfile) {
    console.log('Model profile missing. Run /settings or /model smart <modelId>.');
    return;
  }

  const intentData = normalizer.normalize(input);
  
  if (intentData.intent === "followup_lookup") {
     const lastFile = resolver.resolveTargetFile(input) || runtimeSessionState.toolObservations.getLastCreatedFile();
     const lastDir = resolver.resolveTargetDirectory(input) || runtimeSessionState.toolObservations.getLastCreatedDirectory();
     
     // Continue to normal chat but we will make sure observation text handles it well
  } else if (intentData.intent === "code_action") {
     const targetDir = resolver.resolveTargetDirectory(input, intentData.targetDirectory);
     const targetFile = resolver.resolveTargetFile(input, intentData.targetPath);
     if (targetDir) intentData.targetDirectory = targetDir;
     if (targetFile) intentData.targetPath = targetFile;
  } else if (intentData.intent === "write_documentation") {
     const targetDir = resolver.resolveTargetDirectory(input, intentData.targetDirectory);
     if (targetDir) intentData.targetDirectory = targetDir;
  }

  runtimeSessionState.updateLastTask(input, intentData.intent);

  const providerId = (state.provider || config.defaultProvider) as string;

  if (intentData.intent === 'code_action') {
    if (rl) {
      const result = await runCodeAction({
        input,
        cwd: state.cwd,
        history: chatSession.getHistory(),
        config,
        router,
        targetProfile,
        providerId,
        rl,
        sessionState: runtimeSessionState,
        intent: intentData
      });
      if (result) {
        chatSession.addMessage({ role: 'user', content: input });
        chatSession.addMessage({ role: 'assistant', content: result.summary });
      }
      return;
    }
  } else if (intentData.intent === 'write_documentation') {
    if (rl) {
      const result = await runDocumentation({
        input,
        cwd: state.cwd,
        history: chatSession.getHistory(),
        config,
        router,
        targetProfile,
        providerId,
        rl,
        sessionState: runtimeSessionState,
        intent: intentData
      });
      if (result) {
        chatSession.addMessage({ role: 'user', content: input });
        chatSession.addMessage({ role: 'assistant', content: result.summary });
      }
      return;
    }
  }
 else if (intentData.intent === 'plan') {
    console.log('\nRunning plan workflow...');
    try {
      const planProfile: ModelProfile = config.models.planner ? 'planner' : targetProfile!;
      const result = await runPlanMode({
        cwd: state.cwd,
        task: input,
        profile: planProfile
      });
      console.log(`\n${result.plan}`);
    } catch (err: any) {
      console.log(`\n${red}Plan Workflow Error: ${err.message}${reset}`);
    }
    return;
  }

  // Check API key
  try {
    const providerConfig = resolveProviderConfig(config, providerId as any);
    if (!process.env[providerConfig.apiKeyEnv]) {
      console.log(`Missing API key for ${providerId}.\nRun /settings to set it for this shell session, or export ${providerConfig.apiKeyEnv}.`);
      return;
    }
  } catch (err: any) {
    console.log(`${red}Error: ${err.message}${reset}`);
    return;
  }

  // Try to build context
  let contextStr = '';
  try {
    const contextData = await buildProjectContext({ cwd: state.cwd });
    const formatted = formatProjectContextForPrompt(contextData);
    // Truncate context string if it gets too large
    contextStr = `\n\nWorkspace Context:\n${formatted.substring(0, 4000)}`;
  } catch (err) {
    // ignore context errors
  }

  // Inject session observation context
  let observationStr = '';
  const recentFiles = runtimeSessionState.toolObservations.getCreatedFiles();
  const recentDirs = runtimeSessionState.toolObservations.getCreatedDirectories();
  const summary = runtimeSessionState.toolObservations.getLastActionSummary();
  
  if (recentFiles.length > 0 || recentDirs.length > 0 || summary !== "No recent actions.") {
    observationStr = `\n\nRecent Tool Observations from this Session (USE THIS to answer questions like "mana filenya?"):
- Created Files: ${recentFiles.join(', ') || 'None'}
- Created Directories: ${recentDirs.join(', ') || 'None'}
- Summary: ${summary}
`;
  } else {
    observationStr = `\n\nRecent Tool Observations from this Session: None. No files or directories have been created yet.`;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT + contextStr + observationStr },
    ...chatSession.getHistory(),
    { role: 'user', content: input }
  ];

  console.log('Thinking...');

  try {
    const response = await router.chatWithProfile({
      profile: targetProfile,
      messages,
      providerId: providerId as any
    });

    console.log(response.content);

    // Save to history
    chatSession.addMessage({ role: 'user', content: input });
    chatSession.addMessage({ role: 'assistant', content: response.content });

  } catch (err: any) {
    let msg = err.message;
    // ensure we don't print keys accidentally if they are in error messages
    const providerConfig = resolveProviderConfig(config, providerId as any);
    const key = process.env[providerConfig.apiKeyEnv];
    if (key && msg.includes(key)) {
      msg = msg.replace(new RegExp(key, 'g'), '***');
    }
    console.log(`${red}Chat Error: ${msg}${reset}`);
  }

}