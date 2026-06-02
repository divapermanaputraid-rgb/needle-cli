import * as readline from 'node:readline';
import { loadNeedleConfig } from '../../config/loader.js';
import { createInitialShellState } from './shell-state.js';
import { renderBrandHeader } from './render-brand.js';
import { handleSlashCommand } from './slash-commands.js';
import { runSettingsWizard } from './settings-wizard.js';
import { ChatSession } from './chat-session.js';
import { RuntimeController } from './runtime-controller.js';

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
  const runtimeController = new RuntimeController();

  console.clear();
  renderBrandHeader(state);

  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  if (state.config && state.provider) {
    console.log(`${dim}Type naturally, or use /plan for planning. /help for commands.${reset}\n`);
  } else {
    console.log(`${dim}Type /settings to connect a provider. /help for commands.${reset}\n`);
  }

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.startsWith('/')) {
      await handleSlashCommand(input, state, chatSession, rl, runtimeController);
    } else {
      await runtimeController.handleUserInput(input, state, chatSession, rl);
    }
    rl.prompt();
  }).on('close', () => {
    console.log(`\n${dim}Exiting Needle...${reset}`);
    process.exit(0);
  });
}