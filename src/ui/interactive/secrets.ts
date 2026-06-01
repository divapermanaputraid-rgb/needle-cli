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