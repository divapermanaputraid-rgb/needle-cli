import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultConfig, saveFungiConfig } from "../../config/loader.js";

export const initCommand = new Command("init")
  .description("Initialize FungiCode in the current directory")
  .option("-f, --force", "Overwrite existing configuration")
  .action(async (options) => {
    const cwd = process.cwd();
    const configDir = path.join(cwd, ".fungi");
    const configPath = path.join(configDir, "config.json");

    try {
      if (!options.force) {
        try {
          await fs.access(configPath);
          console.error(`Error: Configuration already exists at ${configPath}`);
          console.error("Use --force to overwrite.");
          process.exit(1);
        } catch {
          // File does not exist, safe to proceed
        }
      }

      console.log(`Initializing FungiCode in ${cwd}...`);
      
      const defaultConfig = createDefaultConfig();
      await saveFungiConfig(cwd, defaultConfig);

      // Create sessions and cache directories
      await fs.mkdir(path.join(configDir, "sessions"), { recursive: true });
      await fs.mkdir(path.join(configDir, "cache"), { recursive: true });

      // Create default MEMORY.md
      const memoryContent = `# FungiCode Project Memory

This file stores durable project context for FungiCode.

Rules:
- Do not store secrets.
- Do not store API keys.
- Store technical decisions, project conventions, and architectural notes.
- Keep this file concise.
`;
      await fs.writeFile(path.join(configDir, "MEMORY.md"), memoryContent, "utf-8");

      console.log("\nSuccessfully initialized FungiCode!");
      console.log(`Created configuration at ${configPath}`);
      console.log("\nNext steps:");
      console.log("1. View current models: fungi models");
      console.log("2. Set a provider: fungi config set provider <provider-id>");
      console.log("3. Set a model: fungi config set model.fast <model-id>");
      console.log("4. Try a chat: fungi chat \"hello world\"");
      
    } catch (error: any) {
      console.error(`Failed to initialize FungiCode: ${error.message}`);
      process.exit(1);
    }
  });