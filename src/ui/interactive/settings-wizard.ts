import * as readline from 'node:readline';
import { ShellState } from './shell-state.js';
import { loadNeedleConfig, saveNeedleConfig, createDefaultConfig } from '../../config/loader.js';
import { setSessionSecret, getEnvVarName } from './secrets.js';
import { NeedleConfig } from '../../config/schema.js';

const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';

export async function runSettingsWizard(rl: readline.Interface, state: ShellState): Promise<void> {
  let config = state.config;

  if (!config) {
    const init = await askQuestion(rl, `\n${yellow}Needle workspace is not initialized. Initialize now? (Y/n)${reset} `);
    if (init.toLowerCase() === 'n') {
      console.log(`\nRun ${cyan}needle init${reset} first.\n`);
      return;
    }
    config = createDefaultConfig();
    await saveNeedleConfig(state.cwd, config);
    state.config = config;
    state.provider = config.defaultProvider;
  }

  while (true) {
    console.log(`\n${bold}Needle Settings${reset}`);
    console.log(`1. Provider`);
    console.log(`2. Models / Agent Profiles`);
    console.log(`3. API Key`);
    console.log(`4. Permission Mode`);
    console.log(`5. Memory`);
    console.log(`6. Back`);

    const choice = await askQuestion(rl, '\nSelect: ');

    switch (choice.trim()) {
      case '1':
        await providerSettings(rl, state, config!);
        break;
      case '2':
        await modelSettings(rl, state, config!);
        break;
      case '3':
        await apiKeySettings(rl, state, config!);
        break;
      case '4':
      case '5':
        console.log(`\n${dim}Not implemented in this MVP.${reset}`);
        break;
      case '6':
        console.log(`\n${dim}Settings saved.${reset}`);
        console.log(`${dim}Try: /plan inspect this project${reset}\n`);
        return;
      default:
        console.log(`\n${yellow}Invalid choice.${reset}`);
    }
  }
}

export async function providerSettings(rl: readline.Interface, state: ShellState, config: NeedleConfig): Promise<void> {
  console.log(`\n${bold}Provider Settings${reset}`);
  console.log(`1. 9Router`);
  console.log(`2. OpenRouter`);
  console.log(`3. OpenAI Compatible`);
  console.log(`4. Gemini`);
  console.log(`5. DeepSeek`);
  console.log(`6. Back`);

  const choice = await askQuestion(rl, '\nSelect: ');
  let provider = '';

  switch (choice.trim()) {
    case '1': provider = '9router'; break;
    case '2': provider = 'openrouter'; break;
    case '3': provider = 'openai-compatible'; break;
    case '4': provider = 'gemini'; break;
    case '5': provider = 'deepseek'; break;
    case '6': return;
    default:
      console.log(`\n${yellow}Invalid choice.${reset}`);
      return;
  }

  config.defaultProvider = provider;
  state.provider = provider;

  if (provider === '9router') {
    const defaultUrl = 'http://localhost:20128/v1';
    let baseUrl = await askQuestion(rl, `baseUrl (default: ${defaultUrl}): `);
    if (!baseUrl.trim()) {
      baseUrl = defaultUrl;
    }
    
    try {
      new URL(baseUrl);
    } catch {
       console.log(`\n${yellow}Invalid URL format.${reset}`);
       return;
    }

    if (!config.providers) config.providers = {};
    if (!config.providers['9router']) config.providers['9router'] = { apiKeyEnv: 'NINE_ROUTER_API_KEY' };
    config.providers['9router'].baseUrl = baseUrl;
    
    console.log(`\n${dim}9Router dashboard manages upstream provider auth. Needle only needs the 9Router gateway endpoint and gateway API key if required.${reset}`);
  }

  await saveNeedleConfig(state.cwd, config);
  console.log(`\n${cyan}Provider set to ${provider}.${reset}`);
}

export async function apiKeySettings(rl: readline.Interface, state: ShellState, config: NeedleConfig): Promise<void> {
  const provider = state.provider || config.defaultProvider;
  const envVar = getEnvVarName(provider);

  if (!envVar) {
    console.log(`\n${yellow}Unknown provider: ${provider}${reset}`);
    return;
  }

  console.log(`\n${bold}API Key Settings${reset}`);
  console.log(`${dim}Input will be visible in this MVP. Avoid recording or sharing terminal output.${reset}`);
  
  const key = await askQuestion(rl, `Enter API key for current provider (${provider} -> ${envVar}): `);
  
  if (key.trim()) {
    setSessionSecret(provider, key.trim());
    console.log(`\n${cyan}API key set for this shell session only.${reset}`);
    console.log(`${dim}To persist it later, export ${envVar} in your shell profile.${reset}`);
  } else {
    console.log(`\n${dim}API key not updated.${reset}`);
  }
}

export async function modelSettings(rl: readline.Interface, state: ShellState, config: NeedleConfig): Promise<void> {
  while (true) {
    console.log(`\n${bold}Model Profiles${reset}`);
    console.log(`\nCurrent mapping:`);
    const profiles = ['fast', 'smart', 'coder', 'planner', 'reviewer'] as const;
    for (const p of profiles) {
      console.log(`${p.padEnd(8)} -> ${config.models[p] || '<model or missing>'}`);
    }

    console.log(`\nOptions:`);
    console.log(`1. Set all profiles to one model`);
    console.log(`2. Set each profile manually`);
    console.log(`3. Set one profile`);
    console.log(`4. Back`);

    const choice = await askQuestion(rl, '\nSelect: ');

    switch (choice.trim()) {
      case '1':
        const model = await askQuestion(rl, 'Model/combo name: ');
        if (model.trim()) {
          for (const p of profiles) {
            config.models[p] = model.trim();
          }
          await saveNeedleConfig(state.cwd, config);
        }
        break;
      
      case '2':
        for (const p of profiles) {
          const m = await askQuestion(rl, `${p} model: `);
          if (m.trim()) {
            config.models[p] = m.trim();
          }
        }
        await saveNeedleConfig(state.cwd, config);
        break;

      case '3':
        const profile = await askQuestion(rl, 'Profile: ');
        if (profiles.includes(profile.trim() as any)) {
          const m = await askQuestion(rl, 'Model: ');
          if (m.trim()) {
            config.models[profile.trim() as keyof typeof config.models] = m.trim();
            await saveNeedleConfig(state.cwd, config);
          }
        } else {
          console.log(`\n${yellow}Invalid profile. Must be one of: ${profiles.join(', ')}${reset}`);
        }
        break;

      case '4':
        return;
        
      default:
        console.log(`\n${yellow}Invalid choice.${reset}`);
    }
  }
}

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}