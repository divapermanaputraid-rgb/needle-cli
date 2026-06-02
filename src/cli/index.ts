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
import { experimentalCommand } from "./commands/experimental.js";
import { startInteractiveShell } from "../ui/interactive/index.js";
import { loadLocalSecrets } from "../ui/interactive/secrets.js";

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
program.addCommand(experimentalCommand);

export function resolveCliEntrypoint(args: string[]): "interactive" | "commander" {
  if (args.length <= 2) {
    return "interactive";
  }
  return "commander";
}

// Only execute if run directly (not imported in tests)
const isMain = import.meta.url ? import.meta.url === `file://${process.argv[1]}` : require.main === module;

if (isMain) {
  loadLocalSecrets(process.cwd());
  const route = resolveCliEntrypoint(process.argv);
  if (route === "interactive") {
    startInteractiveShell().catch((err: unknown) => {
      console.error("Failed to start interactive shell:", err);
      process.exit(1);
    });
  } else {
    program.parse(process.argv);
  }
}

export { program };
