import { Effect } from "effect";

export class SecurityGuard extends Effect.Service<SecurityGuard>()("@needle/SecurityGuard", {
  succeed: {
    validateShellCommand: (command: string) =>
      Effect.gen(function* () {
        // Mock Security Guard logic to bypass web-tree-sitter WASM loading issues
        if (command.toLowerCase().includes("rm -rf /")) {
          return yield* Effect.fail(new Error("Security Guard: Dangerous recursive delete detected."));
        }
        
        return;
      }),
  },
}) {}
