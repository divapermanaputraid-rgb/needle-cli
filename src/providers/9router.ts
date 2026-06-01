import type { Provider, ChatRequest, ChatResponse } from './types';
import type { NeedleConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';
import { parseOpenAIResponse } from './openai-parser';

export function createNineRouter(config: NeedleConfig): Provider {
  return {
    id: '9router',
    displayName: '9Router',
    supports: {
      streaming: true,
      toolCalling: true,
      jsonSchema: true,
      vision: true,
      longContext: true,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const providerConfig = resolveProviderConfig(config, '9router');
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
      }

      // If baseUrl is empty, we must throw an error, 9router URL must be specified
      if (!providerConfig.baseUrl) {
        throw new Error(`Missing base URL for 9Router. Set it in config.`);
      }

      const res = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/needle/needle-cli',
          'X-Title': 'Needle',
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
      const parsed = parseOpenAIResponse(text, '9Router', res.status);

      return {
        content: parsed.content,
        model: request.model,
        provider: '9router',
        usage: parsed.usage,
      };
    }
  };
}
