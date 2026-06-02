import { Effect, Layer } from "effect";
import { ChatMessage, ChatResponse, NativeTool } from "./provider-types.js";
import { ConfigProvider } from "./config.js";

export class Provider extends Effect.Service<Provider>()("@needle/Provider", {
  accessors: true,
  dependencies: [ConfigProvider.Default],
  effect: Effect.gen(function* () {
    const configProvider = yield* ConfigProvider;

    return {
      chat: (messages: readonly ChatMessage[], tools: readonly NativeTool[]) =>
        Effect.gen(function* () {
          const activeProvider = yield* configProvider.getActiveProvider();
          const lastMessage = messages[messages.length - 1];
          const content = lastMessage?.content || "";

          switch (activeProvider) {
            case "openai": {
              const apiKey = process.env.OPENAI_API_KEY;
              if (!apiKey) {
                return yield* Effect.fail(new Error("OPENAI_API_KEY not found in environment."));
              }

              // Map messages to OpenAI format
              const oaiMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
                ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
              }));

              // Map tools to OpenAI format
              const oaiTools = tools.map(t => ({
                type: "function",
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters
                }
              }));

              const body = {
                model: "gpt-4o",
                messages: oaiMessages,
                tools: oaiTools.length > 0 ? oaiTools : undefined,
                tool_choice: oaiTools.length > 0 ? "auto" : undefined
              };

              const response = yield* Effect.tryPromise({
                try: () => fetch("https://api.openai.com/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                  },
                  body: JSON.stringify(body)
                }),
                catch: (error) => new Error(`OpenAI API Fetch Error: ${error}`)
              });

              if (!response.ok) {
                const errorData = yield* Effect.promise(() => response.text());
                return yield* Effect.fail(new Error(`OpenAI API Error (${response.status}): ${errorData}`));
              }

              const data = yield* Effect.promise(() => response.json()) as any;
              const choice = data.choices[0];

              return {
                content: choice.message.content,
                tool_calls: choice.message.tool_calls
              } as ChatResponse;
            }

            case "anthropic":
              return {
                content: `[Anthropic Stub] Processing: "${content}". API integration pending.`,
                tool_calls: undefined,
              } as ChatResponse;

            case "mock":
            default:
              // Semantic Mock Logic (keeping for testing)
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
                content: `[Mock] I heard: "${content}".`,
                tool_calls: undefined,
              } as ChatResponse;
          }
        }),
    };
  }),
}) {}
