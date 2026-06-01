import { ShellState } from './shell-state.js';
import { ChatSession } from './chat-session.js';
import { createProviderRouter } from '../../providers/router.js';
import { buildProjectContext, formatProjectContextForPrompt } from '../../core/context-builder.js';
import { resolveModelProfile, resolveProviderConfig } from '../../config/loader.js';
import type { ChatMessage, ModelProfile } from '../../providers/types';
import type { NeedleConfig } from '../../config/schema.js';
import { routeIntent } from './intent-router.js';
import { runAgentLoop } from '../../core/agent-loop.js';
import { runPlanMode } from '../../planner/plan-mode.js';
import * as readline from 'node:readline';

const SYSTEM_PROMPT = `You are Needle, an AI coding CLI assistant.
Help with software engineering, project analysis, planning, debugging, and safe coding workflows.
You are inside an interactive terminal session.
When answering questions or analyzing the workspace, provide detailed, helpful, and natural explanations. Do not answer with one tiny compressed paragraph unless explicitly asked for a short answer.
For code changes, suggest using /plan or /code.
Do not claim to have modified files unless a tool workflow was explicitly run. NEVER claim you created, edited, or deleted files unless the tool workflow actually ran.`;

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

  const intent = routeIntent(input);

  if (intent === 'code') {
    if (rl) {
      const yellow = '\x1b[33m';
      const reset = '\x1b[0m';
      rl.pause();
      const confirm = await new Promise<string>(resolve => {
        rl.question(`\n${yellow}This looks like a workspace change:\n"${input}"\n\nRun coding agent? (Y/n) ${reset}`, answer => {
          resolve(answer);
        });
      });
      rl.resume();
      
      if (confirm.toLowerCase() === 'y' || confirm === '') {
        console.log('\nRunning code workflow...');
        try {
          const codeProfile: ModelProfile = config.models.coder ? 'coder' : targetProfile!;
          const result = await runAgentLoop({
            cwd: state.cwd,
            task: input,
            profile: codeProfile,
            providerChat: async (msgs) => router.chatWithProfile({ profile: codeProfile, messages: msgs, providerId: (state.provider || config.defaultProvider) as any })
          });
          console.log(`\n${result.summary}`);
        } catch (err: any) {
          console.log(`\n${red}Code Workflow Error: ${err.message}${reset}`);
        }
        return;
      } else {
        return;
      }
    }
  } else if (intent === 'plan') {
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
  const providerId = (state.provider || config.defaultProvider) as any;
  try {
    const providerConfig = resolveProviderConfig(config, providerId);
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

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT + contextStr },
    ...chatSession.getHistory(),
    { role: 'user', content: input }
  ];

  console.log('Thinking...');

  try {
    const response = await router.chatWithProfile({
      profile: targetProfile,
      messages,
      providerId
    });

    console.log(response.content);

    // Save to history
    chatSession.addMessage({ role: 'user', content: input });
    chatSession.addMessage({ role: 'assistant', content: response.content });

  } catch (err: any) {
    let msg = err.message;
    // ensure we don't print keys accidentally if they are in error messages
    const providerConfig = resolveProviderConfig(config, providerId);
    const key = process.env[providerConfig.apiKeyEnv];
    if (key && msg.includes(key)) {
      msg = msg.replace(new RegExp(key, 'g'), '***');
    }
    console.log(`${red}Chat Error: ${msg}${reset}`);
  }
}