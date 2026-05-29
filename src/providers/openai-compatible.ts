import type { Provider, ChatRequest, ChatResponse } from './types';
import type { NeedleConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';

export function createOpenAICompatible(config: NeedleConfig): Provider {
  return {
    id: 'openai-compatible',
    displayName: 'OpenAI Compatible',
    supports: {
      streaming: true,
      toolCalling: true,
      jsonSchema: true,
      vision: true,
      longContext: true,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const providerConfig = resolveProviderConfig(config, 'openai-compatible');
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
      }
      if (!providerConfig.baseUrl) {
        throw new Error(`Missing baseUrl for openai-compatible in config.`);
      }

      const res = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
        throw new Error(`OpenAI Compatible API error: ${res.status} - ${text}`);
      }

      const data = await res.json() as any;
      return {
        content: data.choices[0].message.content,
        model: request.model,
        provider: 'openai-compatible',
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    }
  };
}