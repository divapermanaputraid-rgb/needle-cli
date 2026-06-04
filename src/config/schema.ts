import { z } from 'zod';
import type { ProviderId, ModelProfile } from '../providers/types';

export const ProviderConfigSchema = z.object({
  baseUrl: z.string().optional(),
  apiKeyEnv: z.string(),
});

export const NeedleConfigSchema = z.object({
  defaultProvider: z.string().default('9router'),
  models: z.object({
    router: z.string().default(''),
    fast: z.string().default(''),
    smart: z.string().default(''),
    coder: z.string().default(''),
    planner: z.string().default(''),
    reviewer: z.string().default(''),
  }).default({
    router: '',
    fast: '',
    smart: '',
    coder: '',
    planner: '',
    reviewer: ''
  }),
  permissions: z.object({
    mode: z.enum(['ask', 'auto-low-risk', 'yolo']).default('ask'),
  }).default({ mode: 'ask' }),
  providers: z.record(z.string(), ProviderConfigSchema).optional(),
});

export const DEFAULT_PROVIDER_CONFIGS: Record<string, ResolvedProviderConfig> = {
  "9router": { baseUrl: "", apiKeyEnv: "NINE_ROUTER_API_KEY" },
  "openrouter": { baseUrl: "https://openrouter.ai/api/v1", apiKeyEnv: "OPENROUTER_API_KEY" },
  "openai-compatible": { baseUrl: "", apiKeyEnv: "OPENAI_API_KEY" },
  "gemini": { apiKeyEnv: "GEMINI_API_KEY" },
  "deepseek": { baseUrl: "https://api.deepseek.com", apiKeyEnv: "DEEPSEEK_API_KEY" },
};

export type NeedleConfig = z.infer<typeof NeedleConfigSchema>;
export type ResolvedProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type PermissionMode = NeedleConfig['permissions']['mode'];
