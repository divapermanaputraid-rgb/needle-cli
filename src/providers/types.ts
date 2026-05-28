export type ProviderId =
  | "nine-router"
  | "openai-compatible"
  | "gemini"
  | "deepseek";

export type ModelProfile =
  | "fast"
  | "smart"
  | "coder"
  | "planner"
  | "reviewer";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: ProviderId;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface Provider {
  id: ProviderId;
  displayName: string;
  supports: {
    streaming: boolean;
    toolCalling: boolean;
    jsonSchema: boolean;
    vision: boolean;
    longContext: boolean;
  };
  chat(request: ChatRequest): Promise<ChatResponse>;
}