import { Effect, Layer } from "effect";
import { Logger } from "./core/logger.js";
import { ConfigProvider } from "./core/config.js";
import { FileSystem } from "./core/filesystem.js";
import { Database } from "./core/database.js";
import { Provider } from "./core/provider.js";
import { NativeTool } from "./core/provider-types.js";
import { ToolRegistry } from "./core/tool-registry.js";
import { applyPatchTool, applyPatchHandler } from "./tools/apply_patch.js";
import { SecurityGuard } from "./core/security-ast.js";
import { shellTool, shellHandler } from "./tools/shell.js";

// Main program logic
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  const config = yield* ConfigProvider;
  const db = yield* Database;
  const provider = yield* Provider;
  const toolRegistry = yield* ToolRegistry;
  const fs = yield* FileSystem;
  
  yield* logger.log("Needle v2 Effect Runtime Initialized");
  yield* logger.log(`Working directory: ${config.cwd}`);

  // 1. Define and Register tools
  const fileWriteTool: NativeTool = {
    name: "file_write",
    description: "Write content to a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file" },
        content: { type: "string", description: "The content to write" }
      },
      required: ["path", "content"]
    }
  };

  yield* toolRegistry.register(fileWriteTool, (args: { path: string, content: string }) => 
    Effect.gen(function* () {
      yield* fs.writeFile(args.path, args.content);
      return `Successfully wrote file ${args.path}`;
    })
  );

  yield* toolRegistry.register(applyPatchTool, applyPatchHandler);
  yield* toolRegistry.register(shellTool, shellHandler);

  // 2. Create a persistent session
  const sessionId = yield* db.createSession("Full Feature & Security Test");
  yield* logger.log(`Created session: ${sessionId}`);

  // 3. Get tools from registry
  const availableTools = yield* toolRegistry.getTools();

  // 4. Test Scenario: "patch file"
  yield* logger.log("\nScenario 1: Requesting file patch...");
  const resp1 = yield* provider.chat([{ role: "user", content: "Please patch file for me" }], availableTools);
  if (resp1.tool_calls) {
    for (const call of resp1.tool_calls) {
      const result = yield* toolRegistry.execute(call.function.name, call.function.arguments).pipe(Effect.either);
      if (result._tag === "Left") {
        yield* logger.error(`  Patch Failed: ${result.left.message}`);
      } else {
        yield* logger.log(`  Result: ${result.right}`);
      }
    }
  }

  // 5. Test Scenario: "destroy everything" (Security Test)
  yield* logger.log("\nScenario 2: SECURITY TEST - 'destroy everything'...");
  const resp2 = yield* provider.chat([{ role: "user", content: "destroy everything" }], availableTools);
  
  if (resp2.tool_calls) {
    for (const call of resp2.tool_calls) {
      yield* logger.log(`- Attempting to execute ${call.function.name} with: ${call.function.arguments}`);
      // Use flip to catch the error for logging purposes
      const execution = yield* toolRegistry.execute(call.function.name, call.function.arguments).pipe(Effect.either);
      if (execution._tag === "Left") {
        yield* logger.error(`  BLOCKED: ${execution.left.message}`);
      } else {
        yield* logger.log(`  Result: ${execution.right}`);
      }
    }
  }

  // 6. Test Scenario: "safe task" (YOLO Test)
  yield* logger.log("\nScenario 3: YOLO TEST - 'safe task'...");
  const resp3 = yield* provider.chat([{ role: "user", content: "safe task" }], availableTools);
  
  if (resp3.tool_calls) {
    for (const call of resp3.tool_calls) {
      const result = yield* toolRegistry.execute(call.function.name, call.function.arguments);
      yield* logger.log(`  Result: ${result}`);
    }
  }
});

// Setup unified Live Layer
const MainLive = Layer.mergeAll(
  Logger.Default,
  ConfigProvider.Default,
  FileSystem.Default,
  Database.Default,
  Provider.Default,
  ToolRegistry.Default,
  SecurityGuard.Default
);

// Execution
Effect.runPromise(Effect.provide(program, MainLive)).catch((error) => {
  console.error("Initialization Failed:", error);
  process.exit(1);
});
