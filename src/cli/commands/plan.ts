// Needle: needle plan
import { Command } from "commander";
import { printHeader } from "../../ui/terminal.js";

export function planCommand(): Command {
  return new Command("plan")
    .description("Enter structured plan mode")
    .argument("[task]", "task description")
    .action((task) => {
      printHeader("Plan Mode");
      console.log(`Task: ${task ?? "(none)"}`);
      console.log("Status: placeholder");
      console.log("Next: planner loop implementation — Sprint 1");
    });
}
