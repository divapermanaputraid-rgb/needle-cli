import { Effect } from "effect";
import { NativeTool } from "./provider-types.js";
import { ConfigProvider } from "./config.js";
import { Logger } from "./logger.js";
import { McpClient } from "./mcp.js";

export type ToolHandler = (args: any) => Effect.Effect<string, Error>;

export class ToolRegistry extends Effect.Service<ToolRegistry>()("@needle/ToolRegistry", {
  dependencies: [ConfigProvider.Default, Logger.Default],
  effect: Effect.gen(function* () {
    const tools = new Map<string, { tool: NativeTool; handler: ToolHandler }>();
    let mcpClient: McpClient | undefined;

    return {
      register: (tool: NativeTool, handler: ToolHandler) =>
        Effect.sync(() => {
          tools.set(tool.name, { tool, handler });
        }),

      registerMcpClient: (client: McpClient) =>
        Effect.sync(() => {
          mcpClient = client;
        }),

      getTools: () =>
        Effect.gen(function* () {
          const localTools = Array.from(tools.values()).map((t) => t.tool);
          if (mcpClient) {
            const externalTools = yield* mcpClient.getMcpTools();
            return [...localTools, ...externalTools];
          }
          return localTools;
        }),

      execute: (name: string, args: string) =>
        Effect.gen(function* () {
          const configProvider = yield* ConfigProvider;
          const config = yield* configProvider.getConfig();
          const logger = yield* Logger;
          
          if (config.isYoloMode) {
            yield* logger.log(`[YOLO MODE] Auto-executing tool '${name}'...`);
          } else {
            yield* logger.log(`[Manual Mode] Waiting for user approval for tool '${name}'... [Auto-approving for MVP]`);
          }

          // Delegation to MCP if prefix match
          if (name.startsWith("mcp_") && mcpClient) {
            return yield* mcpClient.callMcpTool(name, args);
          }

          const entry = tools.get(name);
          if (!entry) {
            return yield* Effect.fail(new Error(`Tool '${name}' not found in registry.`));
          }

          const parsedArgs = yield* Effect.try({
            try: () => JSON.parse(args),
            catch: (error) => new Error(`Failed to parse arguments for tool '${name}': ${error}`),
          });

          return yield* entry.handler(parsedArgs);
        }),
    };
  }),
}) {}
