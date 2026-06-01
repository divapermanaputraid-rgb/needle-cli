import { ShellState } from './shell-state.js';
import { renderBrandHeader } from './render-brand.js';
import * as readline from 'node:readline';
import { runSettingsWizard, providerSettings, modelSettings } from './settings-wizard.js';
import { handleInteractiveChat } from './interactive-chat.js';
import type { ChatSession } from './chat-session.js';

export async function handleSlashCommand(input: string, state: ShellState, chatSession: ChatSession, rl?: readline.Interface): Promise<boolean> {
  const parts = input.trim().split(/\s+/);
  const command = parts[0];

  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const cyan = '\x1b[36m';
  const yellow = '\x1b[33m';

  switch (command) {
    case '/chat':
      const chatInput = parts.slice(1).join(' ');
      if (!chatInput) {
        console.log(`\n${yellow}Missing message. Usage: /chat <message>${reset}\n`);
      } else {
        await handleInteractiveChat(chatInput, state, chatSession);
      }
      return true;

    case '/help':
      console.log(`
${bold}Available Commands:${reset}
  ${cyan}/chat${reset}       Send a plain chat message (or just type without a slash)
  ${cyan}/help${reset}       Print all available slash commands
  ${cyan}/status${reset}     Show current configuration and environment status
  ${cyan}/models${reset}     List configured providers and model profiles
  ${cyan}/provider${reset}   Show or set active provider (e.g. /provider openrouter)
  ${cyan}/model${reset}      Show or set active model profile (e.g. /model fast anthropic/claude-3-haiku)
  ${cyan}/plan${reset}       Run plan workflow (e.g. /plan inspect project)
  ${cyan}/code${reset}       Run code workflow (e.g. /code fix lint errors)
  ${cyan}/review${reset}     Run review workflow
  ${cyan}/reflect${reset}    Run reflect workflow
  ${cyan}/sessions${reset}   Show recent sessions
  ${cyan}/doctor${reset}     Run system checks
  ${cyan}/clear${reset}      Clear terminal and show header
  ${cyan}/exit${reset}       Exit the interactive shell
      `);
      return true;

    case '/exit':
      console.log(`${dim}Exiting Needle...${reset}`);
      process.exit(0);
      return true;

    case '/clear':
      console.clear();
      renderBrandHeader();
      return true;

    case '/status':
      console.log(`\n${bold}System Status:${reset}`);
      console.log(`  CWD:      ${state.cwd}`);
      console.log(`  Config:   ${state.config ? 'Found' : `${yellow}Missing (Run needle init)${reset}`}`);
      console.log(`  Provider: ${state.provider || 'None'}`);
      console.log(`  Profile:  ${state.profile || 'None'}`);
      console.log(`  Model:    ${state.modelId || 'None'}\n`);
      return true;

    case '/models':
      if (!state.config) {
        console.log(`\n${yellow}Config missing. Run: needle init${reset}\n`);
      } else {
        console.log(`\n${bold}Configured Models:${reset}`);
        if (state.config.models) {
          for (const [profile, modelId] of Object.entries(state.config.models)) {
            console.log(`  ${profile}: ${modelId || 'Not set'}`);
          }
        }
        console.log(`\n${dim}Tip: Run ${cyan}needle models${dim} in another terminal for detailed list.${reset}\n`);
      }
      return true;

    case '/settings':
      if (rl) {
        rl.pause();
        runSettingsWizard(rl, state).then(() => rl.resume());
      } else {
        console.log(`\n${yellow}Settings wizard requires interactive shell.${reset}\n`);
      }
      return true;

    case '/connect':
      if (rl) {
        rl.pause();
        if (state.config) {
          providerSettings(rl, state, state.config).then(() => rl.resume());
        } else {
          runSettingsWizard(rl, state).then(() => rl.resume()); // Drop to main wizard to init
        }
      } else {
        console.log(`\n${yellow}Interactive shell required.${reset}\n`);
      }
      return true;

    case '/provider':
      if (parts.length > 1) {
         if (!state.config) {
            console.log(`\n${yellow}Config missing. Run: needle init${reset}\n`);
            return true;
         }
        console.log(`\n${dim}To set provider permanently, run: ${cyan}needle config set provider ${parts[1]}${reset}\n`);
      } else if (rl) {
        rl.pause();
        if (state.config) {
          providerSettings(rl, state, state.config).then(() => rl.resume());
        } else {
          runSettingsWizard(rl, state).then(() => rl.resume());
        }
      }
      return true;

    case '/model':
      if (parts.length > 2) {
         if (!state.config) {
            console.log(`\n${yellow}Config missing. Run: needle init${reset}\n`);
            return true;
         }
        console.log(`\n${dim}To set model permanently, run: ${cyan}needle config set model.${parts[1]} ${parts[2]}${reset}\n`);
      } else if (rl) {
        rl.pause();
        if (state.config) {
          modelSettings(rl, state, state.config).then(() => rl.resume());
        } else {
           runSettingsWizard(rl, state).then(() => rl.resume());
        }
      }
      return true;

    case '/plan':
      if (parts.length > 1) {
        console.log(`\n${dim}Running plan mode in v1 will be integrated. For now, exit and run: ${cyan}needle plan "${parts.slice(1).join(' ')}"${reset}\n`);
      } else {
        console.log(`\n${yellow}Missing task. Usage: /plan <task>${reset}\n`);
      }
      return true;

    case '/code':
      if (parts.length > 1) {
        console.log(`\n${dim}Running code mode in v1 will be integrated. For now, exit and run: ${cyan}needle code "${parts.slice(1).join(' ')}"${reset}\n`);
      } else {
        console.log(`\n${yellow}Missing task. Usage: /code <task>${reset}\n`);
      }
      return true;

    case '/review':
      console.log(`\n${dim}Running review mode in v1 will be integrated. For now, exit and run: ${cyan}needle review${reset}\n`);
      return true;

    case '/reflect':
      console.log(`\n${dim}Running reflect mode in v1 will be integrated. For now, exit and run: ${cyan}needle reflect${reset}\n`);
      return true;

    case '/sessions':
      console.log(`\n${dim}To view sessions, exit and run: ${cyan}needle sessions list${reset}\n`);
      return true;

    case '/doctor':
      console.log(`\n${dim}To run diagnostics, exit and run: ${cyan}needle doctor${reset}\n`);
      return true;

    default:
      console.log(`\n${yellow}Unknown command: ${command}${reset}`);
      console.log(`${dim}Type /help for a list of commands.${reset}\n`);
      return true;
  }
}