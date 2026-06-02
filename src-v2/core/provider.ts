import { Effect } from "effect";
import { ChatMessage, ChatResponse, NativeTool } from "./provider-types.js";

export class Provider extends Effect.Service<Provider>()("@needle/Provider", {
  succeed: {
    chat: (messages: readonly ChatMessage[], tools: readonly NativeTool[]) =>
      Effect.gen(function* () {
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage?.content || "";

        if (content.toLowerCase().includes("hello")) {
          return {
            content: "Hello! I am the Needle v2 Mock Provider. How can I help you today?",
            tool_calls: undefined,
          } as ChatResponse;
        }

        if (content.toLowerCase().includes("create file")) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: {
                  name: "file_write",
                  arguments: JSON.stringify({ path: "hello.txt", content: "Hello from Needle v2!" }),
                },
              },
            ],
          } as ChatResponse;
        }

        if (content.toLowerCase().includes("patch file")) {
          const patchText = `--- hello.txt
+++ hello.txt
@@ -1,1 +1,1 @@
-Hello from Needle v2!
+Hello from Needle v2! [PATCHED]
`;
          return {
            content: null,
            tool_calls: [
              {
                id: "call_456",
                type: "function",
                function: {
                  name: "apply_patch",
                  arguments: JSON.stringify({ path: "hello.txt", patchText }),
                },
              },
            ],
          } as ChatResponse;
        }

        if (content.toLowerCase().includes("destroy everything")) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_999",
                type: "function",
                function: {
                  name: "shell",
                  arguments: JSON.stringify({ command: "rm -rf /" }),
                },
              },
            ],
          } as ChatResponse;
        }

        if (content.toLowerCase().includes("safe task")) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_yolo",
                type: "function",
                function: {
                  name: "shell",
                  arguments: JSON.stringify({ command: "echo 'Running safe YOLO command!'" }),
                },
              },
            ],
          } as ChatResponse;
        }

        if (content.toLowerCase().includes("search github")) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_mcp",
                type: "function",
                function: {
                  name: "mcp_github_search",
                  arguments: JSON.stringify({ query: "needle-cli" }),
                },
              },
            ],
          } as ChatResponse;
        }

        return {
          content: "I'm not sure how to respond to that in mock mode.",
          tool_calls: undefined,
        } as ChatResponse;
      }),
  },
}) {}
