import { Effect } from "effect";
import { NativeTool } from "./provider-types.js";

export class McpClient extends Effect.Service<McpClient>()("@needle/McpClient", {
  succeed: {
    connect: (serverName: string, command: string) =>
      Effect.sync(() => {
        console.log(`[MCP] Connecting to server '${serverName}' via: ${command}`);
      }),

    getMcpTools: () =>
      Effect.sync(() => [
        {
          name: "mcp_github_search",
          description: "Search for repositories on GitHub via MCP",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query" },
            },
            required: ["query"],
          },
        } as NativeTool,
      ]),

    callMcpTool: (name: string, args: string) =>
      Effect.succeed(`MCP Server executed: ${name} with ${args}`),
  },
}) {}
