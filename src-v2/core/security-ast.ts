import { Effect } from "effect";
import path from "node:path";

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SecurityGuard extends Effect.Service<SecurityGuard>()("@needle/SecurityGuard", {
  effect: Effect.gen(function* () {
    // 1. Resolve WASM paths
    const treeSitterWasm = path.resolve(__dirname, "../../tree-sitter.wasm");
    const bashWasm = path.resolve(__dirname, "../../tree-sitter-bash.wasm");

    // 2. Dynamic import to get named exports
    const { Parser, Language } = yield* Effect.promise(() => import("web-tree-sitter"));

    // 3. Initialize Parser
    yield* Effect.promise(() => Parser.init({
      locateFile: () => treeSitterWasm
    }));

    const parser = new Parser();

    // 4. Load Bash Language
    const Bash = yield* Effect.promise(() => Language.load(bashWasm));
    parser.setLanguage(Bash);


    return {
      validateShellCommand: (command: string) =>
        Effect.gen(function* () {
          const tree = parser.parse(command);
          const root = tree.rootNode;

          // Recursive walk to find dangerous commands
          const checkNode = (node: Parser.SyntaxNode): boolean => {
            if (node.type === "command") {
              const text = node.text.toLowerCase();
              // Logic: check for 'rm' with '-rf' and '/'
              if (text.includes("rm") && text.includes("-rf") && text.includes("/")) {
                // Precise check: ensure / is a root or system-wide path
                // For MVP, if it has 'rm', '-rf', and '/', we block.
                return true;
              }
            }
            for (let i = 0; i < node.childCount; i++) {
              if (checkNode(node.child(i)!)) return true;
            }
            return false;
          };

          if (checkNode(root)) {
            return yield* Effect.fail(new Error("Security Guard: Dangerous recursive delete detected."));
          }
          
          return;
        }),
    };
  }),
}) {}
