import fs from 'node:fs';
import path from 'node:path';

const SECRETS_DIR = '.needle';
const SECRETS_FILE = 'secrets.local.json';

export function getSecretsPath(cwd: string): string {
  return path.join(cwd, SECRETS_DIR, SECRETS_FILE);
}

export function loadLocalSecrets(cwd: string): void {
  const secretsPath = getSecretsPath(cwd);
  try {
    if (!fs.existsSync(secretsPath)) return;
    const data = fs.readFileSync(secretsPath, 'utf-8');
    const secrets = JSON.parse(data);
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === 'string' && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    // silently fail if parsing issues etc.
  }
}

export function saveLocalSecret(cwd: string, provider: string, apiKey: string): void {
  const envVar = getEnvVarName(provider);
  if (!envVar) return;

  const secretsDir = path.join(cwd, SECRETS_DIR);
  const secretsPath = getSecretsPath(cwd);

  try {
    if (!fs.existsSync(secretsDir)) {
      fs.mkdirSync(secretsDir, { recursive: true });
      // Add .needle/ to gitignore if gitignore exists and .needle/ is missing
      const gitignorePath = path.join(cwd, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        if (!gitignoreContent.includes('.needle/')) {
          fs.appendFileSync(gitignorePath, '\n.needle/\n');
        }
      }
    }

    let secrets: Record<string, string> = {};
    if (fs.existsSync(secretsPath)) {
      try {
        secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      } catch (err) {
        // ignore JSON parse error, just overwrite
      }
    }

    secrets[envVar] = apiKey;
    fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), { mode: 0o600, encoding: 'utf-8' });
  } catch (err) {
    // Ignore FS errors
  }
}

export function getSecretStatus(cwd: string, provider: string): 'set from environment' | 'saved locally' | 'missing' {
  const envVar = getEnvVarName(provider);
  if (!envVar) return 'missing';

  const secretsPath = getSecretsPath(cwd);
  let savedSecret: string | undefined;
  if (fs.existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      savedSecret = secrets[envVar];
    } catch {}
  }

  const envSecret = process.env[envVar];

  if (envSecret && savedSecret) {
    if (envSecret === savedSecret) {
      return 'saved locally';
    }
    return 'set from environment';
  }
  
  if (envSecret) {
    return 'set from environment';
  }
  
  if (savedSecret) {
    return 'saved locally';
  }

  return 'missing';
}

export function clearLocalSecrets(cwd: string): void {
  const secretsPath = getSecretsPath(cwd);
  if (fs.existsSync(secretsPath)) {
    try {
      fs.unlinkSync(secretsPath);
    } catch (err) {}
  }
}

export function forgetLocalSecret(cwd: string, envVar: string): void {
  const secretsPath = getSecretsPath(cwd);
  if (fs.existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      if (secrets[envVar]) {
        delete secrets[envVar];
        fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), { mode: 0o600, encoding: 'utf-8' });
      }
    } catch (err) {}
  }
}

export function setSessionSecret(provider: string, apiKey: string): void {
  const envVar = getEnvVarName(provider);
  if (envVar) {
    process.env[envVar] = apiKey;
  }
}

export function getSessionSecret(provider: string): string | undefined {
  const envVar = getEnvVarName(provider);
  return envVar ? process.env[envVar] : undefined;
}

export function getEnvVarName(provider: string): string | undefined {
  switch (provider.toLowerCase()) {
    case '9router': return 'NINE_ROUTER_API_KEY';
    case 'openrouter': return 'OPENROUTER_API_KEY';
    case 'openai-compatible': return 'OPENAI_API_KEY';
    case 'gemini': return 'GEMINI_API_KEY';
    case 'deepseek': return 'DEEPSEEK_API_KEY';
    default: return undefined;
  }
}