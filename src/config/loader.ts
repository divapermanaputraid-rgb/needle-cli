import fs from 'node:fs/promises';
import path from 'node:path';
import { FungiConfigSchema, FungiConfig, ResolvedProviderConfig } from './schema';
import type { ProviderId, ModelProfile } from '../providers/types';

const CONFIG_DIR = '.fungi';
const CONFIG_FILE = 'config.json';

export async function loadFungiConfig(cwd: string): Promise<FungiConfig> {
  const configPath = path.join(cwd, CONFIG_DIR, CONFIG_FILE);
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    return FungiConfigSchema.parse(parsed);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Config file not found at ${configPath}. Please run 'fungi init'.`);
    }
    throw new Error(`Failed to load config: ${err.message}`);
  }
}

export async function saveFungiConfig(cwd: string, config: FungiConfig): Promise<void> {
  const configDir = path.join(cwd, CONFIG_DIR);
  const configPath = path.join(configDir, CONFIG_FILE);
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function createDefaultConfig(): FungiConfig {
  return FungiConfigSchema.parse({});
}

export function resolveModelProfile(config: FungiConfig, profile: ModelProfile): string {
  const modelId = config.models[profile];
  if (!modelId) {
    throw new Error(`Model profile '${profile}' is not configured. Run 'fungi config set model.${profile} <modelId>'.`);
  }
  return modelId;
}

export function resolveProviderConfig(config: FungiConfig, providerId?: ProviderId): ResolvedProviderConfig {
  const id = providerId || config.defaultProvider;
  const providerConfig = config.providers[id];
  if (!providerConfig) {
    throw new Error(`Provider '${id}' is not configured.`);
  }
  return providerConfig as ResolvedProviderConfig;
}