// Needle: needle review
import { Command } from "commander";
import { printHeader } from "../../ui/terminal.js";

export function reviewCommand(): Command {
  return new Command("review")
    .description("AI-powered diff / code review")
    .option("--staged", "review staged git changes")
    .action((opts) => {
      printHeader("Review Mode");
      console.log(`Staged: ${opts.staged ?? false}`);
      console.log("Status: placeholder");
      console.log("Next: diff-reviewer + AI summary — Sprint 1");
    });
}
