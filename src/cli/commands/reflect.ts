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
        let activeProvider = "unknown";
        if (options.llm) {
           let config;
           try {
             config = await loadNeedleConfig(cwd);
           } catch {
             config = createDefaultConfig();
           }
           activeProvider = config.defaultProvider || "unknown";
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

        // 5. CLI output polish
        print("\nReflect Summary:");
        print(`  Sessions Read: ${result.sessionsRead}`);
        print(`  Memory Path:   ${result.memoryPath}`);
        if (options.dryRun) {
          print(`  Dry Run:       true (no files modified)`);
        }
        
        // Mode extraction
        let modeOut = "deterministic";
        let fallbackOut = "false";
        
        if (options.llm) {
           modeOut = "LLM-assisted";
           if (result.summary.includes("fallback to deterministic") || result.summary.includes("failed")) {
               fallbackOut = "true";
           }
        }
        
        print(`  Mode:          ${modeOut}`);
        if (options.llm) {
           print(`  Provider:      ${activeProvider}`);
           print(`  Profile:       ${options.profile || "smart"}`);
           print(`  Fallback:      ${fallbackOut}`);
        }
        print(""); // Empty line for spacing
        
        if (result.sessionsRead === 0) {
          print("No sessions found to reflect upon.");
          return;
        }

        if (result.dryRun) {
          print(`[DRY RUN] Proposed memory update:\n`);
          console.log(result.proposedMemory);
        } else {
          print(result.summary);
        }

      } catch (error: any) {
        // No stack traces for normal config/provider errors
        printError(`Reflect failed: ${error.message}`);
        process.exit(1);
      }
    });
  
  return cmd;
}