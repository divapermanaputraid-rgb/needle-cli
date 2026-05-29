// Needle: needle code
import { Command } from "commander";
import { printHeader } from "../../ui/terminal.js";

export function codeCommand(): Command {
  return new Command("code")
    .description("Run AI-assisted coding agent")
    .argument("[task]", "coding task")
    .option("-p, --profile <profile>", "model profile", "coder")
    .action((task, opts) => {
      printHeader("Code Mode");
      console.log(`Task: ${task ?? "(none)"}`);
      console.log(`Profile: ${opts.profile}`);
      console.log("Status: placeholder");
      console.log("Next: agent loop + tool execution — Sprint 1");
    });
}
