import { Command } from "commander";
import { loadFungiConfig, saveFungiConfig } from "../../config/loader.js";
import { ProviderId, ModelProfile } from "../../providers/types.js";

export const configCommand = new Command("config")
  .description("Manage FungiCode configuration");

configCommand
  .command("get")
  .description("Print current configuration")
  .action(async () => {
    try {
      const config = await loadFungiConfig(process.cwd());
      console.log(JSON.stringify(config, null, 2));
    } catch (error: any) {
      console.error(error.message);
      process.exit(1);
    }
  });

configCommand
  .command("set <key> <value>")
  .description("Set a configuration value. Examples: 'provider nine-router', 'model.coder deepseek/deepseek-coder'")
  .action(async (key: string, value: string) => {
    try {
      const config = await loadFungiConfig(process.cwd());

      if (key === "provider") {
        const validProviders: ProviderId[] = ["nine-router", "openai-compatible", "gemini", "deepseek"];
        if (!validProviders.includes(value as ProviderId)) {
          throw new Error(`Invalid provider '${value}'. Must be one of: ${validProviders.join(", ")}`);
        }
        config.defaultProvider = value;
      } else if (key.startsWith("model.")) {
        const profile = key.split(".")[1] as ModelProfile;
        const validProfiles: ModelProfile[] = ["fast", "smart", "coder", "planner", "reviewer"];
        if (!validProfiles.includes(profile)) {
          throw new Error(`Invalid model profile '${profile}'. Must be one of: ${validProfiles.join(", ")}`);
        }
        config.models[profile] = value;
      } else {
        throw new Error(`Invalid config key '${key}'. Supported keys: 'provider', 'model.<profile>'`);
      }

      await saveFungiConfig(process.cwd(), config);
      console.log(`Successfully set ${key} to ${value}`);
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });