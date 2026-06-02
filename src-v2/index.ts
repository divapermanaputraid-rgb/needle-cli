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
import { McpClient } from "./core/mcp.js";

// Main program logic
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  const configProvider = yield* ConfigProvider;
  const config = yield* configProvider.getConfig();
  const db = yield* Database;
  const provider = yield* Provider;
  const toolRegistry = yield* ToolRegistry;
  const fs = yield* FileSystem;
  const mcpClient = yield* McpClient;

  yield* logger.log("Needle v2 Effect Runtime Initialized");
  yield* logger.log(`Working directory: ${config.cwd}`);

  // 1. Initialize MCP Client
  yield* mcpClient.connect("github-mcp", "npx @modelcontextprotocol/server-github");
  yield* toolRegistry.registerMcpClient(mcpClient);

  // 2. Define and Register local tools
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

  yield* toolRegistry.register(fileWriteTool, ((args: { path: string, content: string }) =>
    Effect.gen(function* () {
      yield* fs.writeFile(args.path, args.content);
      return `Successfully wrote file ${args.path}`;
    })) as any
  );

  yield* toolRegistry.register(applyPatchTool, applyPatchHandler as any);
  yield* toolRegistry.register(shellTool, shellHandler as any);

  // 3. Create a persistent session
  const sessionId = yield* db.createSession("Full Integration Test");
  yield* logger.log(`Created session: ${sessionId}`);

  // 4. Get all tools (Local + MCP)
  const availableTools = yield* toolRegistry.getTools();
  yield* logger.log(`Available Tools: ${availableTools.map(t => t.name).join(", ")}`);

  // 5. Scenario: "search github" (MCP Test)
  yield* logger.log("\nScenario: MCP TEST - 'search github'...");
  const mcpResp = yield* provider.chat([{ role: "user", content: "search github" }], availableTools);

  if (mcpResp.tool_calls) {
    for (const call of mcpResp.tool_calls) {
      const result = yield* (toolRegistry.execute(call.function.name, call.function.arguments) as any);
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
  SecurityGuard.Default,
  McpClient.Default
);

// Execution
Effect.runPromise(Effect.provide(program as any, MainLive)).catch((error) => {
  console.error("Initialization Failed:", error);
  process.exit(1);
});
