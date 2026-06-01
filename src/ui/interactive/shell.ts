import * as readline from 'node:readline';
import { loadNeedleConfig } from '../../config/loader.js';
import { createInitialShellState } from './shell-state.js';
import { renderBrandHeader } from './render-brand.js';
import { handleSlashCommand } from './slash-commands.js';
import { runSettingsWizard, providerSettings, modelSettings } from './settings-wizard.js';
import { ChatSession } from './chat-session.js';
import { handleInteractiveChat } from './interactive-chat.js';

export async function startInteractiveShell(): Promise<void> {
  let config;
  try {
    config = await loadNeedleConfig(process.cwd());
  } catch (err) {
    config = null; // Don't crash on missing config for shell startup
  }

  const state = createInitialShellState(process.cwd(), config);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  const chatSession = new ChatSession();

  console.clear();
  renderBrandHeader();

  const cyan = '\x1b[36m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  const yellow = '\x1b[33m';

  console.log(`${dim}CWD: ${state.cwd}${reset}`);
  if (state.provider) {
    console.log(`${dim}Provider: ${cyan}${state.provider}${reset} | Profile: ${cyan}${state.profile || 'default'}${reset}`);
  }
  console.log(`${dim}Type /help for commands.${reset}\n`);

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.startsWith('/')) {
      await handleSlashCommand(input, state, chatSession, rl);
    } else {
      await handleInteractiveChat(input, state, chatSession);
    }
    rl.prompt();
  }).on('close', () => {
    console.log(`\n${dim}Exiting Needle...${reset}`);
    process.exit(0);
  });
}