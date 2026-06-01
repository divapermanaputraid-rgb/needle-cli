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
    if (isSlashCommandEscape(init)) {
      handleSlashCommandEscape(init);
      return;
    }
    if (init.toLowerCase() === 'n') {
      console.log(`\nRun ${cyan}needle init${reset} first.\n`);
      return;
    }
    config = createDefaultConfig();
    await saveNeedleConfig(state.cwd, config);
    state.config = config;
    state.provider = config.defaultProvider;
  }

  console.log(`\n${bold}Needle Settings Wizard${reset}`);
  
  // 1. Provider
  console.log(`\nSelect provider:`);
  console.log(`1. 9Router`);
  console.log(`2. OpenRouter`);
  console.log(`3. OpenAI Compatible`);
  console.log(`4. Gemini`);
  console.log(`5. DeepSeek`);
  console.log(`6. Cancel`);

  const providerChoice = await askQuestion(rl, '\nChoice: ');
  if (isSlashCommandEscape(providerChoice)) {
    handleSlashCommandEscape(providerChoice);
    return;
  }

  let provider = '';
  switch (providerChoice.trim()) {
    case '1': provider = '9router'; break;
    case '2': provider = 'openrouter'; break;
    case '3': provider = 'openai-compatible'; break;
    case '4': provider = 'gemini'; break;
    case '5': provider = 'deepseek'; break;
    case '6': 
    case 'cancel':
      console.log(`\n${dim}Setup cancelled.${reset}\n`);
      return;
    default:
      console.log(`\n${yellow}Invalid choice. Setup cancelled.${reset}\n`);
      return;
  }

  config.defaultProvider = provider;
  state.provider = provider;

  // 2. Base URL (if needed)
  if (provider === '9router') {
    const defaultUrl = 'http://localhost:20128/v1';
    console.log(`\nBase URL:`);
    console.log(`Default: ${defaultUrl}`);
    console.log(`Example remote: http://your-host:20128/v1`);
    
    let baseUrl = await askQuestion(rl, '\nBase URL: ');
    if (isSlashCommandEscape(baseUrl)) {
      handleSlashCommandEscape(baseUrl);
      return;
    }
    
    if (baseUrl.trim() === 'cancel') {
      console.log(`\n${dim}Setup cancelled.${reset}\n`);
      return;
    }

    if (!baseUrl.trim()) {
      baseUrl = defaultUrl;
    }

    try {
      new URL(baseUrl);
    } catch {
       console.log(`\n${yellow}Invalid URL format. Setup cancelled.${reset}\n`);
       return;
    }

    if (!config.providers) config.providers = {};
    if (!config.providers['9router']) config.providers['9router'] = { apiKeyEnv: 'NINE_ROUTER_API_KEY' };
    config.providers['9router'].baseUrl = baseUrl;
  }

  // 3. API Key
  const envVar = getEnvVarName(provider);
  if (envVar) {
    console.log(`\n${provider === '9router' ? 'Gateway ' : ''}API key:`);
    if (provider === '9router') {
      console.log(`This is the 9Router gateway/API access key, not your upstream provider key.`);
    }
    console.log(`${dim}Input may be visible. Never commit this key.${reset}`);
    
    const key = await askQuestion(rl, '\nAPI key: ');
    if (isSlashCommandEscape(key)) {
      handleSlashCommandEscape(key);
      return;
    }
    
    if (key.trim() === 'cancel') {
      console.log(`\n${dim}Setup cancelled.${reset}\n`);
      return;
    }

    if (key.trim()) {
      setSessionSecret(provider, key.trim());
    }
  }

  // 4. Model/Combo
  console.log(`\nModel/combo name:`);
  console.log(`Examples: low, medium, high, free`);
  
  const modelName = await askQuestion(rl, '\nModel: ');
  if (isSlashCommandEscape(modelName)) {
    handleSlashCommandEscape(modelName);
    return;
  }

  if (modelName.trim() === 'cancel') {
    console.log(`\n${dim}Setup cancelled.${reset}\n`);
    return;
  }
  
  if (!modelName.trim()) {
    console.log(`\n${yellow}Model required. Setup cancelled.${reset}\n`);
    return;
  }

  // 5. Apply Model
  console.log(`\nApply model to:`);
  console.log(`1. All profiles`);
  console.log(`2. Set manually`);

  const applyChoice = await askQuestion(rl, '\nChoice: ');
  if (isSlashCommandEscape(applyChoice)) {
    handleSlashCommandEscape(applyChoice);
    return;
  }

  if (applyChoice.trim() === 'cancel') {
    console.log(`\n${dim}Setup cancelled.${reset}\n`);
    return;
  }

  const profiles = ['fast', 'smart', 'coder', 'planner', 'reviewer'] as const;

  if (applyChoice.trim() === '1') {
    for (const p of profiles) {
      config.models[p] = modelName.trim();
    }
  } else if (applyChoice.trim() === '2') {
    console.log();
    for (const p of profiles) {
      const m = await askQuestion(rl, `${p} model [default: ${modelName.trim()}]: `);
      if (isSlashCommandEscape(m)) {
        handleSlashCommandEscape(m);
        return;
      }
      if (m.trim() === 'cancel') {
        console.log(`\n${dim}Setup cancelled.${reset}\n`);
        return;
      }
      config.models[p] = m.trim() || modelName.trim();
    }
  } else {
    console.log(`\n${yellow}Invalid choice. Setup cancelled.${reset}\n`);
    return;
  }

  // 6 & 7. Save and Summary
  await saveNeedleConfig(state.cwd, config);
  
  console.log(`\n${bold}Saved:${reset}`);
  console.log(`Provider: ${provider}`);
  if (provider === '9router' && config.providers?.['9router']?.baseUrl) {
    console.log(`Base URL: ${config.providers['9router'].baseUrl}`);
  }
  console.log(`Models:`);
  for (const p of profiles) {
    console.log(`${p.padEnd(8)} -> ${config.models[p]}`);
  }
  
  if (envVar && process.env[envVar]) {
    console.log(`\n${cyan}API key set for this shell session only.${reset}`);
  }
  
  console.log(`${dim}Try: /plan inspect this project${reset}\n`);
}

function isSlashCommandEscape(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === 'cancel') return true;
  if (!trimmed.startsWith('/')) return false;
  
  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  
  return ['/exit', '/clear', '/help', '/status', '/models', '/settings', '/connect', '/provider', '/model'].includes(command);
}

function handleSlashCommandEscape(input: string): void {
  const trimmed = input.trim();
  if (trimmed === 'cancel') {
    console.log(`\n${dim}Setup cancelled.${reset}\n`);
    return;
  }
  
  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  
  if (command === '/exit') {
    console.log(`${dim}Exiting Needle...${reset}`);
    process.exit(0);
  } else if (command === '/clear') {
    console.clear();
  } else {
    console.log(`\n${yellow}Finish or cancel setup first.${reset}\n`);
  }
}


function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}