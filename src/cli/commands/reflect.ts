import { Command } from "commander";
import { runReflect } from "../../memory/reflector.js";
import { print, printError } from "../../ui/terminal.js";
import { createProviderRouter } from "../../providers/router.js";
import { loadNeedleConfig, createDefaultConfig } from "../../config/loader.js";
import type { ModelProfile } from "../../providers/types.js";

export function reflectCommand(): Command {
  const cmd = new Command("reflect")
    .description("Reflect on recent sessions and update project memory")
    .option("--limit <number>", "Number of recent sessions to analyze", "20")
    .option("--dry-run", "Print proposed memory update without writing to disk")
    .option("--force", "Override existing memory lock if present")
    .option("--llm", "Use LLM-assisted memory consolidation")
    .option("--profile <profile>", "LLM profile to use (e.g. smart, fast)", "smart")
    .action(async (options) => {
      try {
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit <= 0) {
          throw new Error("Invalid limit. Must be a positive integer.");
        }

        const cwd = process.cwd();
        
        let providerChat;
        if (options.llm) {
           let config;
           try {
             config = await loadNeedleConfig(cwd);
           } catch {
             config = createDefaultConfig();
           }
           const router = createProviderRouter(config);
           providerChat = async (messages: any[]) => router.chatWithProfile({
             profile: options.profile as ModelProfile,
             messages,
             dryRun: options.dryRun
           });
        }

        const result = await runReflect({
          cwd,
          limit,
          dryRun: options.dryRun,
          force: options.force,
          llm: options.llm,
          profile: options.profile as ModelProfile,
          providerChat,
        });

        if (result.sessionsRead === 0) {
          print(result.summary);
          return;
        }

        if (result.dryRun) {
          print(`\n[DRY RUN] Proposed memory update based on ${result.sessionsRead} sessions:\n`);
          console.log(result.proposedMemory);
        } else {
          print(result.summary);
        }

      } catch (error: any) {
        printError(`Reflect failed: ${error.message}`);
        process.exit(1);
      }
    });
  
  return cmd;
}