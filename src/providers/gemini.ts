import type { Provider, ChatRequest, ChatResponse } from './types';
import type { FungiConfig } from '../config/schema';
import { resolveProviderConfig } from '../config/loader';

export function createGemini(config: FungiConfig): Provider {
  return {
    id: 'gemini',
    displayName: 'Google Gemini',
    supports: {
      streaming: true,
      toolCalling: true,
      jsonSchema: true,
      vision: true,
      longContext: true,
    },
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const providerConfig = resolveProviderConfig(config, 'gemini');
      const apiKey = process.env[providerConfig.apiKeyEnv];
      if (!apiKey) {
        throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
      }

      // Keep straightforward check, return error for now as requested by PRD for Gemini adapter if not fully implemented.
      throw new Error('Gemini adapter is not fully implemented yet.');
    }
  };
}