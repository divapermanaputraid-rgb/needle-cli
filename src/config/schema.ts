import { z } from "zod";

export const ProviderConfigSchema = z.object({
  baseUrl: z.string().optional(),
  apiKeyEnv: z.string(),
});

export const FungiConfigSchema = z.object({
  defaultProvider: z.string().default("nine-router"),
  models: z.object({
    fast: z.string().default(""),
    smart: z.string().default(""),
    coder: z.string().default(""),
    planner: z.string().default(""),
    reviewer: z.string().default(""),
  }).default({
    fast: "",
    smart: "",
    coder: "",
    planner: "",
    reviewer: ""
  }),
  permissions: z.object({
    mode: z.enum(["ask", "auto-low-risk", "yolo"]).default("ask"),
  }).default({ mode: "ask" }),
  providers: z.record(z.string(), ProviderConfigSchema).default({
    "nine-router": {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnv: "NINE_ROUTER_API_KEY"
    },
    "openai-compatible": {
      baseUrl: "",
      apiKeyEnv: "OPENAI_API_KEY"
    },
    "gemini": {
      apiKeyEnv: "GEMINI_API_KEY"
    },
    "deepseek": {
      baseUrl: "https://api.deepseek.com",
      apiKeyEnv: "DEEPSEEK_API_KEY"
    }
  })
});

export type FungiConfig = z.infer<typeof FungiConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type PermissionMode = "ask" | "auto-low-risk" | "yolo";
