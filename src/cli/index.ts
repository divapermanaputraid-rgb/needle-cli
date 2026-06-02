#!/usr/bin/env node
// Needle CLI entry point — Sprint 0
import { Command } from "commander";
import { initCommand }   from "./commands/init.js";
import { chatCommand }   from "./commands/chat.js";
import { planCommand }   from "./commands/plan.js";
import { codeCommand }   from "./commands/code.js";
import { reviewCommand } from "./commands/review.js";
import { configCommand } from "./commands/config.js";
import { modelsCommand } from "./commands/models.js";
import { toolsCommand } from "./commands/tools.js";
import { sessionsCommand } from "./commands/sessions.js";
import { reflectCommand } from "./commands/reflect.js";
import { doctorCommand } from "./commands/doctor.js";
import { startInteractiveShell } from "../ui/interactive/index.js";

const program = new Command();

program
  .name("needle")
  .description("Needle — open-source, multi-provider AI coding CLI")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(chatCommand);
program.addCommand(planCommand());
program.addCommand(codeCommand());
program.addCommand(reviewCommand());
program.addCommand(configCommand);
program.addCommand(modelsCommand);
program.addCommand(toolsCommand);
program.addCommand(sessionsCommand());
program.addCommand(reflectCommand());
program.addCommand(doctorCommand);

// If no arguments provided, launch the interactive shell
if (process.argv.length <= 2) {
  console.log("\x1b[35m%s\x1b[0m", "\n[ Needle v2 (Super Agent Mode) Activated ]\n");
  // Launch the new v2 TUI architecture
  import("../../src-v2/tui/run-tui.js").catch((err) => {
    console.error("Failed to start Needle v2 TUI:", err);
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}
