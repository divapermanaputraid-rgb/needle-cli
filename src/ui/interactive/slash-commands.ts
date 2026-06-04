import { ShellState } from './shell-state.js';
import { renderBrandHeader } from './render-brand.js';
import * as readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { runSettingsWizard } from './settings-wizard.js';
import { saveNeedleConfig } from '../../config/loader.js';
import { handleInteractiveChat } from './interactive-chat.js';
import type { ChatSession } from './chat-session.js';
import type { RuntimeController } from './runtime-controller.js';
import { getSecretStatus, clearLocalSecrets, forgetLocalSecret, getEnvVarName } from './secrets.js';

export function formatDisplayPath(cwd: string, home = os.homedir()): string {
  if (!path.isAbsolute(cwd)) {
    return cwd || '.';
  }

  const relativeToHome = path.relative(home, cwd);
  const isOutsideHome = relativeToHome === '..' ||
    relativeToHome.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToHome);

  if (!isOutsideHome) {
    return relativeToHome ? path.join('~', relativeToHome) : '~';
  }

  const basename = path.basename(cwd);
  return basename ? `./${basename}` : '.';
}

export async function handleSlashCommand(input: string, state: ShellState, chatSession: ChatSession, rl?: readline.Interface, runtimeController?: RuntimeController): Promise<boolean> {
  if (!input.trim().startsWith('/')) {
    return false;
  }

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
  ${cyan}/help${reset}       Print all available slash commands
  ${cyan}/status${reset}     Show current configuration and environment status
  ${cyan}/models${reset}     List configured providers and model profiles
  ${cyan}/provider${reset}   Show or set active provider (e.g. /provider openrouter)
  ${cyan}/model${reset}      Show or set active model profile (e.g. /model fast anthropic/claude-3-haiku)
  ${cyan}/plan${reset}       Run plan workflow (e.g. /plan inspect project)
  ${cyan}/sessions${reset}   Show recent sessions
  ${cyan}/doctor${reset}     Run system checks
  ${cyan}/clear${reset}      Clear terminal and show header
  ${cyan}/exit${reset}       Exit the interactive shell
      `);
      return true;

    case '/secrets':
      if (parts[1] === 'clear') {
        clearLocalSecrets(state.cwd);
        console.log(`\n${cyan}Local secrets cleared.${reset}\n`);
      } else if (parts[1] === 'forget' && parts[2]) {
        forgetLocalSecret(state.cwd, parts[2]);
        console.log(`\n${cyan}Forgot local secret: ${parts[2]}${reset}\n`);
      } else {
        console.log(`\n${bold}Secrets:${reset}`);
        const providers = ['9router', 'openrouter', 'openai-compatible', 'gemini', 'deepseek'];
        for (const p of providers) {
          const envVar = getEnvVarName(p);
          if (envVar) {
            const status = getSecretStatus(state.cwd, p);
            console.log(`  * ${envVar}: ${status}`);
          }
        }
        console.log(`\n${dim}Commands: /secrets clear, /secrets forget <ENV_VAR>${reset}\n`);
      }
      return true;

    case '/exit':
      console.log(`${dim}Exiting Needle...${reset}`);
      process.exit(0);
      return true;

    case '/clear':
      console.clear();
      renderBrandHeader(state);
      return true;

    case '/whoami':
      console.log(`\n${bold}Active Identity:${reset}`);
      console.log(`  Provider:      ${state.provider || state.config?.defaultProvider || 'None'}`);
      console.log(`  Smart Model:   ${state.config?.models?.smart || 'None'}`);
      
      console.log(`  CWD:           ${formatDisplayPath(state.cwd, process.env.HOME || os.homedir())}\n`);
      return true;

    case '/pwd':
      console.log(`\n${cyan}Current Working Directory:${reset}`);
      console.log(`${state.cwd}\n`);
      return true;

    case '/status':
      console.log(`\n${bold}System Status:${reset}`);
      console.log(`  CWD:      ${state.cwd}`);
      console.log(`  Config:   ${state.config ? 'Found' : `${yellow}Missing (Run needle init)${reset}`}`);
      console.log(`  Provider: ${state.provider || 'None'}`);
      if (state.provider) {
         console.log(`  Secret:   ${getSecretStatus(state.cwd, state.provider)}`);
      }
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
    case '/connect':
      if (rl) {
        rl.pause();
        runSettingsWizard(rl, state).then(() => rl.resume());
      } else {
        console.log(`\n${yellow}Settings wizard requires interactive shell.${reset}\n`);
      }
      return true;

    case '/provider':
      if (!state.config) {
        console.log(`\n${yellow}Config missing. Run /settings.${reset}\n`);
        return true;
      }
      
      if (parts.length > 1) {
        const newProvider = parts[1];
        const validProviders = ['9router', 'openrouter', 'openai-compatible', 'gemini', 'deepseek'];
        
        if (!validProviders.includes(newProvider)) {
          console.log(`\n${yellow}Invalid provider. Valid options: ${validProviders.join(', ')}${reset}\n`);
          return true;
        }
        
        state.config.defaultProvider = newProvider;
        state.provider = newProvider;
        saveNeedleConfig(state.cwd, state.config).then(() => {
          console.log(`\n${cyan}Provider set to ${newProvider}.${reset}\n`);
        });
      } else {
        console.log(`\nCurrent provider: ${state.provider || state.config.defaultProvider || 'None'}`);
        console.log(`\nUsage:`);
        console.log(`/provider <provider>`);
        console.log(`/settings\n`);
      }
      return true;

    case '/model':
      if (!state.config) {
        console.log(`\n${yellow}Config missing. Run /settings.${reset}\n`);
        return true;
      }

      if (parts.length > 1) {
        const action = parts[1]; // 'all' or a profile name
        const modelName = parts[2];
        const profiles = ['router', 'fast', 'smart', 'coder', 'planner', 'reviewer'] as const;

        if (!modelName) {
           console.log(`\n${yellow}Missing model name. Usage: /model <profile|all> <model>${reset}\n`);
           return true;
        }

        if (action === 'all') {
           for (const p of profiles) {
             state.config.models[p] = modelName;
           }
           saveNeedleConfig(state.cwd, state.config).then(() => {
             console.log(`\n${cyan}Set all profiles to ${modelName}.${reset}\n`);
           });
        } else if (profiles.includes(action as any)) {
           state.config.models[action as keyof typeof state.config.models] = modelName;
           saveNeedleConfig(state.cwd, state.config).then(() => {
             console.log(`\n${cyan}Set ${action} to ${modelName}.${reset}\n`);
           });
        } else {
           console.log(`\n${yellow}Invalid profile. Valid profiles: ${profiles.join(', ')}${reset}\n`);
        }
      } else {
        console.log(`\nCurrent model profiles:`);
        const profiles = ['router', 'fast', 'smart', 'coder', 'planner', 'reviewer'] as const;
        for (const p of profiles) {
          console.log(`${p.padEnd(8)} -> ${state.config.models[p] || '<missing>'}`);
        }
        console.log(`\nUsage:`);
        console.log(`/model all <model>`);
        console.log(`/model <profile> <model>`);
        console.log(`/settings\n`);
      }
      return true;

    case '/plan':
      if (parts.length > 1) {
        if (runtimeController) {
          const task = parts.slice(1).join(' ');
          await runtimeController.handlePlanAction(task, state);
        } else {
          await handleInteractiveChat(input, state, chatSession, rl);
        }
      } else {
        console.log(`\n${yellow}Missing task. Usage: /plan <task>${reset}\n`);
      }
      return true;

    case '/code':
      if (parts.length > 1) {
        if (runtimeController && rl) {
          const task = parts.slice(1).join(' ');
          // Tell the runtime controller this is explicitly a code action
          await runtimeController.handleCodeAction(task, state, chatSession, rl, {
            intent: "code_action",
            needsClarification: false
          });
        } else {
          await handleInteractiveChat(input, state, chatSession, rl);
        }
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
