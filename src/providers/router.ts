import type { Provider, ProviderId, ModelProfile, ChatMessage, ChatResponse } from './types';
import type { FungiConfig } from '../config/schema';
import { resolveModelProfile, resolveProviderConfig } from '../config/loader';
import { createNineRouter } from './nine-router';
import { createOpenAICompatible } from './openai-compatible';
import { createGemini } from './gemini';
import { createDeepSeek } from './deepseek';

export interface ProviderSummary {
  id: ProviderId;
  displayName: string;
}

export interface ModelProfileSummary {
  profile: ModelProfile;
  model: string;
}

export class ProviderRouter {
  private config: FungiConfig;
  private providers: Map<ProviderId, Provider>;

  constructor(config: FungiConfig) {
    this.config = config;
    this.providers = new Map();

    this.registerProviders();
  }

  private registerProviders() {
    this.providers.set('nine-router', createNineRouter(this.config));
    this.providers.set('openai-compatible', createOpenAICompatible(this.config));
    this.providers.set('gemini', createGemini(this.config));
    this.providers.set('deepseek', createDeepSeek(this.config));
  }

  listProviders(): ProviderSummary[] {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
    }));
  }

  listModelProfiles(): ModelProfileSummary[] {
    return Object.entries(this.config.models).map(([profile, model]) => ({
      profile: profile as ModelProfile,
      model,
    }));
  }

  getProvider(providerId?: ProviderId): Provider {
    const id = providerId || (this.config.defaultProvider as ProviderId);
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' is unknown or not configured.`);
    }
    return provider;
  }

  async chatWithProfile(input: {
    profile: ModelProfile;
    messages: ChatMessage[];
    providerId?: ProviderId;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ChatResponse> {
    const model = resolveModelProfile(this.config, input.profile);
    const provider = this.getProvider(input.providerId);
    const providerConfig = resolveProviderConfig(this.config, provider.id);
    
    if (!process.env[providerConfig.apiKeyEnv]) {
      throw new Error(`Missing API key. Set ${providerConfig.apiKeyEnv}.`);
    }

    return provider.chat({
      model,
      messages: input.messages,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
  }
}

export function createProviderRouter(config: FungiConfig): ProviderRouter {
  return new ProviderRouter(config);
}