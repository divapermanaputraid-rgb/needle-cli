import { Provider, ProviderId, ChatRequest, ChatResponse } from "./types.js";

export function createOpenAICompatibleProvider(
  id: ProviderId,
  displayName: string,
  baseUrl: string,
  apiKey: string
): Provider {
  return {
    id,
    displayName,
    supports: {
      streaming: false,
      toolCalling: false,
      jsonSchema: false,
      vision: false,
      longContext: false,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      if (!baseUrl) {
        throw new Error(`baseUrl is required for ${displayName} provider`);
      }

      // Ensure baseUrl doesn't end with a slash, then append the completions path
      const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });

      if (!response.ok) {
        let errorText = await response.text();
        try {
          const json = JSON.parse(errorText);
          if (json.error?.message) {
            errorText = json.error.message;
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(`${displayName} API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || "";
      
      return {
        content,
        model: request.model,
        provider: id,
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
      };
    },
  };
}