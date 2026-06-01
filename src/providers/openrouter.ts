import type { Provider, ChatRequest, ChatResponse } from './types';
import type { NeedleConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';
import { parseOpenAIResponse } from './openai-parser';

export function createOpenRouter(config: NeedleConfig): Provider {
  return {
    id: 'openrouter',
    displayName: 'OpenRouter',
    supports: {
      streaming: true,
      toolCalling: true,
      jsonSchema: true,
      vision: true,
      longContext: true,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const providerConfig = resolveProviderConfig(config, 'openrouter');
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
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
      const parsed = parseOpenAIResponse(text, 'OpenRouter', res.status);

      return {
        content: parsed.content,
        model: request.model,
        provider: 'openrouter',
        usage: parsed.usage,
      };
    }
  };
}
