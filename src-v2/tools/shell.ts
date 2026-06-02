import { Effect } from "effect";
import { exec } from "node:child_process";
import { NativeTool } from "../core/provider-types.js";
import { SecurityGuard } from "../core/security-ast.js";

export const shellTool: NativeTool = {
  name: "shell",
  description: "Execute a shell command",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The command to execute" }
    },
    required: ["command"]
  }
};

export const shellHandler = (args: { command: string }) =>
  Effect.gen(function* () {
    const guard = yield* SecurityGuard;
    
    // 1. Validate via AST
    yield* guard.validateShellCommand(args.command);
    
    // 2. Execute if safe
    return yield* Effect.async<string, Error>((resume) => {
      exec(args.command, (error, stdout, stderr) => {
        if (error) {
          resume(Effect.fail(new Error(`Command failed: ${stderr || error.message}`)));
        } else {
          resume(Effect.succeed(stdout || stderr || "Command executed successfully."));
        }
      });
    });
  });
