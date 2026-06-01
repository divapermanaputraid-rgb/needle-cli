import { ShellState } from './shell-state.js';
import { renderBrandHeader } from './render-brand.js';

export function handleSlashCommand(input: string, state: ShellState): boolean {
  const parts = input.trim().split(/\s+/);
  const command = parts[0];

  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const cyan = '\x1b[36m';
  const yellow = '\x1b[33m';

  switch (command) {
    case '/help':
      console.log(`
${bold}Available Commands:${reset}
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

    case '/provider':
      if (!state.config) {
        console.log(`\n${yellow}Config missing. Run: needle init${reset}\n`);
        return true;
      }
      if (parts.length > 1) {
        console.log(`\n${dim}To set provider permanently, run: ${cyan}needle config set provider ${parts[1]}${reset}\n`);
      } else {
        console.log(`\n  Current Provider: ${state.provider || 'None'}`);
        console.log(`  ${dim}Tip: Set with: ${cyan}/provider <name>${reset}\n`);
      }
      return true;

    case '/model':
      if (!state.config) {
        console.log(`\n${yellow}Config missing. Run: needle init${reset}\n`);
        return true;
      }
      if (parts.length > 2) {
        console.log(`\n${dim}To set model permanently, run: ${cyan}needle config set model.${parts[1]} ${parts[2]}${reset}\n`);
      } else {
        console.log(`\n  Current Profile: ${state.profile || 'None'}`);
        console.log(`  ${dim}Tip: Set with: ${cyan}/model <profile> <modelId>${reset}\n`);
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