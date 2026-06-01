import { ShellState } from './shell-state.js';
import { ChatSession } from './chat-session.js';
import { createProviderRouter } from '../../providers/router.js';
import { buildProjectContext, formatProjectContextForPrompt } from '../../core/context-builder.js';
import { resolveModelProfile, resolveProviderConfig } from '../../config/loader.js';
import type { ChatMessage, ModelProfile } from '../../providers/types';
import type { NeedleConfig } from '../../config/schema.js';

const SYSTEM_PROMPT = `You are Needle, an AI coding CLI assistant.
Help with software engineering, project analysis, planning, debugging, and safe coding workflows.
You are inside an interactive terminal session.
For code changes, suggest using /plan or /code.
Do not claim to have modified files unless a tool workflow was explicitly run.`;

export async function handleInteractiveChat(
  input: string,
  state: ShellState,
  chatSession: ChatSession
): Promise<void> {
  const red = '\x1b[31m';
  const reset = '\x1b[0m';

  if (!state.config) {
    console.log('Needle is not configured yet.\nRun /settings to connect a provider and model.');
    return;
  }

  const router = createProviderRouter(state.config);
  
  // Find a usable profile
  let targetProfile: ModelProfile | undefined;
  const profiles: ModelProfile[] = ['smart', 'coder', 'fast'];
  for (const p of profiles) {
    try {
      if (state.config.models[p]) {
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

  // Check API key
  const providerId = (state.provider || state.config.defaultProvider) as any;
  try {
    const providerConfig = resolveProviderConfig(state.config, providerId);
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
    const providerConfig = resolveProviderConfig(state.config, providerId);
    const key = process.env[providerConfig.apiKeyEnv];
    if (key && msg.includes(key)) {
      msg = msg.replace(new RegExp(key, 'g'), '***');
    }
    console.log(`${red}Chat Error: ${msg}${reset}`);
  }
}