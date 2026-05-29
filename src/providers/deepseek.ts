import type { Provider, ChatRequest, ChatResponse } from './types';
import type { NeedleConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';

export function createDeepSeek(config: NeedleConfig): Provider {
  return {
    id: 'deepseek',
    displayName: 'DeepSeek',
    supports: {
      streaming: true,
      toolCalling: true,
      jsonSchema: true,
      vision: false,
      longContext: true,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const providerConfig = resolveProviderConfig(config, 'deepseek');
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
      }

      const res = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek API error: ${res.status} - ${text}`);
      }

      const data = await res.json() as any;
      return {
        content: data.choices[0].message.content,
        model: request.model,
        provider: 'deepseek',
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    }
  };
}