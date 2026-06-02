import { Effect, Layer } from "effect";
import { Logger } from "./core/logger.js";
import { ConfigProvider } from "./core/config.js";
import { FileSystem } from "./core/filesystem.js";
import { Database } from "./core/database.js";
import { Provider } from "./core/provider.js";
import { NativeTool } from "./core/provider-types.js";
import { ToolRegistry } from "./core/tool-registry.js";
import { applyPatchTool, applyPatchHandler } from "./tools/apply_patch.js";

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

  // 2. Create a persistent session
  const sessionId = yield* db.createSession("Tool Execution Test");
  yield* logger.log(`Created session: ${sessionId}`);

  // 3. Get tools from registry
  const availableTools = yield* toolRegistry.getTools();

  // 4. Test Scenario: "create file"
  yield* logger.log("\nScenario 1: Requesting file creation...");
  const resp1 = yield* provider.chat([{ role: "user", content: "Please create file for me" }], availableTools);
  
  if (resp1.tool_calls) {
    for (const call of resp1.tool_calls) {
      const result = yield* toolRegistry.execute(call.function.name, call.function.arguments);
      yield* logger.log(`- Result: ${result}`);
    }
  }

  // 5. Test Scenario: "patch file"
  yield* logger.log("\nScenario 2: Requesting file patch...");
  const resp2 = yield* provider.chat([{ role: "user", content: "Please patch file for me" }], availableTools);
  
  if (resp2.tool_calls) {
    for (const call of resp2.tool_calls) {
      const result = yield* toolRegistry.execute(call.function.name, call.function.arguments);
      yield* logger.log(`- Result: ${result}`);
    }
    
    // Verify file content
    const content = yield* fs.readFile("hello.txt");
    yield* logger.log(`\nVerified content of hello.txt:\n"${content}"`);
  }
});

// Setup unified Live Layer
const MainLive = Layer.mergeAll(
  Logger.Default,
  ConfigProvider.Default,
  FileSystem.Default,
  Database.Default,
  Provider.Default,
  ToolRegistry.Default
);

// Execution
Effect.runPromise(Effect.provide(program, MainLive)).catch((error) => {
  console.error("Initialization Failed:", error);
  process.exit(1);
});
