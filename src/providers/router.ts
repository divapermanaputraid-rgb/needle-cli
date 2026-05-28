import { FungiConfig } from "../config/schema.js";
import { Provider, ProviderId, ModelProfile, ChatMessage, ChatResponse } from "./types.js";
import { resolveModelProfile, resolveProviderConfig } from "../config/loader.js";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

// Basic gemini placeholder adapter
function createGeminiProvider(apiKey: string): Provider {
  return {
    id: "gemini",
    displayName: "Google Gemini",
    supports: {
      streaming: false,
      toolCalling: false,
      jsonSchema: false,
      vision: false,
      longContext: false
    },
    async chat(request) {
      if (!apiKey) {
        throw new Error("Gemini API key is required");
      }
      throw new Error("Gemini adapter not fully implemented yet");
    }
  }
}

export class ProviderRouter {
  private config: FungiConfig;
  private providers: Map<ProviderId, Provider> = new Map();

  constructor(config: FungiConfig) {
    this.config = config;
    this.registerProviders();
  }

  private registerProviders() {
    for (const [id, providerConfig] of Object.entries(this.config.providers)) {
      const apiKey = process.env[providerConfig.apiKeyEnv];
      
      if (id === "nine-router") {
        this.providers.set(id as ProviderId, createOpenAICompatibleProvider(
          "nine-router",
          "9Router (OpenRouter)",
          providerConfig.baseUrl || "https://openrouter.ai/api/v1",
          apiKey || ""
        ));
      } else if (id === "openai-compatible") {
        this.providers.set(id as ProviderId, createOpenAICompatibleProvider(
          "openai-compatible",
          "OpenAI Compatible",
          providerConfig.baseUrl || "",
          apiKey || ""
        ));
      } else if (id === "deepseek") {
        this.providers.set(id as ProviderId, createOpenAICompatibleProvider(
          "deepseek",
          "DeepSeek",
          providerConfig.baseUrl || "https://api.deepseek.com",
          apiKey || ""
        ));
      } else if (id === "gemini") {
        this.providers.set(id as ProviderId, createGeminiProvider(apiKey || ""));
      }
    }
  }

  listProviders() {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      displayName: p.displayName
    }));
  }

  listModelProfiles() {
    return Object.entries(this.config.models).map(([profile, modelId]) => ({
      profile,
      modelId
    }));
  }

  getProvider(providerId?: ProviderId): Provider {
    const id = providerId || (this.config.defaultProvider as ProviderId);
    const provider = this.providers.get(id);
    
    if (!provider) {
      throw new Error(`Provider '${id}' is unknown or not configured.`);
    }
    
    const providerConfig = this.config.providers[id];
    if (!process.env[providerConfig.apiKeyEnv]) {
      throw new Error(`Missing API key. Please set the ${providerConfig.apiKeyEnv} environment variable.`);
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
    const provider = this.getProvider(input.providerId);
    const modelId = resolveModelProfile(this.config, input.profile);
    
    return provider.chat({
      model: modelId,
      messages: input.messages,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
  }
}

export function createProviderRouter(config: FungiConfig): ProviderRouter {
  return new ProviderRouter(config);
}