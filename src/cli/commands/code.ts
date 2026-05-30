// Needle: needle code
import { Command } from "commander";
import { printHeader } from "../../ui/terminal.js";
import { loadNeedleConfig } from "../../config/loader.js";
import { createProviderRouter } from "../../providers/router.js";
import { runAgentLoop } from "../../core/agent-loop.js";
import type { ModelProfile } from "../../providers/types.js";

export function codeCommand(): Command {
  return new Command("code")
    .description("Run AI-assisted coding agent")
    .argument("<task>", "coding task")
    .option("-p, --profile <profile>", "model profile", "coder")
    .option("--max-iterations <number>", "max agent loop iterations", "8")
    .option("--dry-run", "dry run mode (does not execute tools)")
    .option("--plan-first", "placeholder for planning phase")
    .action(async (task, opts) => {
      printHeader("Code Mode");
      console.log(`Task: ${task}`);
      console.log(`Profile: ${opts.profile}`);
      
      const maxIter = parseInt(opts.maxIterations, 10);
      if (isNaN(maxIter)) {
        console.error("Error: --max-iterations must be a number");
        process.exit(1);
      }

      const cwd = process.cwd();
      let config;
      try {
        config = await loadNeedleConfig(cwd);
      } catch (err: any) {
        if (err.message && err.message.includes("Config file not found")) {
          console.error("Error: Config file not found. Run `needle init`.");
        } else {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
      const router = createProviderRouter(config);

      const providerChat = async (messages: any[]) => {
        return router.chatWithProfile({
          profile: opts.profile as ModelProfile,
          messages,
          dryRun: opts.dryRun
        });
      };

      console.log(`Running Agent Loop (Max Iterations: ${maxIter})...`);
      
      const result = await runAgentLoop({
        cwd,
        task,
        profile: opts.profile as ModelProfile,
        maxIterations: maxIter,
        dryRun: opts.dryRun,
        providerChat
      });
      
      console.log(`\n\x1b[36m${"=".repeat(80)}\x1b[0m`);
      console.log(`\x1b[1mTask Result: ${result.ok ? "\x1b[32mSuccess" : "\x1b[31mFailed"}\x1b[0m`);
      console.log(`\x1b[36m${"=".repeat(80)}\x1b[0m`);
      console.log(`\x1b[1mSummary:\x1b[0m\n${result.summary}\n`);
      console.log(`\x1b[1mStats:\x1b[0m`);
      console.log(`  - Iterations: ${result.iterations}`);
      console.log(`  - Tool Calls: ${result.toolCalls.length}`);
      if (result.toolCalls.length > 0) {
        for (const call of result.toolCalls) {
          const status = call.ok ? "\x1b[32mOK\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
          console.log(`    * ${call.tool} (${status})`);
        }
      }
      console.log();
      
      process.exit(result.ok ? 0 : 1);
    });
}