import type { Provider, ChatRequest, ChatResponse } from './types';
import type { NeedleConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';
import { parseOpenAIResponse } from './openai-parser';

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
          stream: false,
        }),
      });

      const text = await res.text();
      const parsed = parseOpenAIResponse(text, 'OpenAI Compatible', res.status);

      return {
        content: parsed.content,
        model: request.model,
        provider: 'openai-compatible',
        usage: parsed.usage,
      };
    }
  };
}
