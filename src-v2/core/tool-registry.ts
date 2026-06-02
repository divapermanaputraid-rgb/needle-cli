import { Effect } from "effect";
import { NativeTool } from "./provider-types.js";
import { ConfigProvider } from "./config.js";
import { Logger } from "./logger.js";

export type ToolHandler = (args: any) => Effect.Effect<string, Error>;

export class ToolRegistry extends Effect.Service<ToolRegistry>()("@needle/ToolRegistry", {
  effect: Effect.gen(function* () {
    const tools = new Map<string, { tool: NativeTool; handler: ToolHandler }>();

    return {
      register: (tool: NativeTool, handler: ToolHandler) =>
        Effect.sync(() => {
          tools.set(tool.name, { tool, handler });
        }),

      getTools: () =>
        Effect.sync(() => Array.from(tools.values()).map((t) => t.tool)),

      execute: (name: string, args: string) =>
        Effect.gen(function* () {
          const config = yield* ConfigProvider;
          const logger = yield* Logger;
          
          const entry = tools.get(name);
          if (!entry) {
            return yield* Effect.fail(new Error(`Tool '${name}' not found in registry.`));
          }

          if (config.isYoloMode) {
            yield* logger.log(`[YOLO MODE] Auto-executing tool '${name}'...`);
          } else {
            yield* logger.log(`[Manual Mode] Waiting for user approval for tool '${name}'... [Auto-approving for MVP]`);
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
