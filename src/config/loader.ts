import fs from "node:fs/promises";
import path from "node:path";
import { FungiConfig, FungiConfigSchema } from "./schema.js";

const CONFIG_DIR_NAME = ".fungi";
const CONFIG_FILE_NAME = "config.json";

export async function loadFungiConfig(cwd: string): Promise<FungiConfig> {
  const configPath = path.join(cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return FungiConfigSchema.parse(parsed);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`Config file not found at ${configPath}. Please run 'fungi init'.`);
    }
    if (error.name === "ZodError") {
      throw new Error(`Invalid config format in ${configPath}:\n${error.message}`);
    }
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}

export async function saveFungiConfig(cwd: string, config: FungiConfig): Promise<void> {
  const configDir = path.join(cwd, CONFIG_DIR_NAME);
  const configPath = path.join(configDir, CONFIG_FILE_NAME);
  
  await fs.mkdir(configDir, { recursive: true });
  
  // Validate before saving
  const validConfig = FungiConfigSchema.parse(config);
  await fs.writeFile(configPath, JSON.stringify(validConfig, null, 2), "utf-8");
}

export function createDefaultConfig(): FungiConfig {
  return FungiConfigSchema.parse({});
}

export function resolveModelProfile(config: FungiConfig, profile: keyof FungiConfig["models"]): string {
  const modelId = config.models[profile];
  if (!modelId) {
    throw new Error(`Model profile '${profile}' is empty. Set it using 'fungi config set model.${profile} <modelId>'.`);
  }
  return modelId;
}

export function resolveProviderConfig(config: FungiConfig, providerId?: string) {
  const id = providerId || config.defaultProvider;
  const providerConfig = config.providers[id];
  
  if (!providerConfig) {
    throw new Error(`Provider '${id}' is not configured in .fungi/config.json.`);
  }
  
  return {
    id,
    ...providerConfig
  };
}