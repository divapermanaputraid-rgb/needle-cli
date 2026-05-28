// FungiCode Gemini Provider — Sprint 0 placeholder
import type { Provider, ProviderId, ModelProfile, ChatRequest, ChatResponse } from "./types.js";

export class GeminiProvider implements Provider {
  id: ProviderId = "gemini";
  displayName = "Google Gemini";
  supports = { 
    chat: true, 
    streaming: false, 
    toolCalling: false, 
    jsonSchema: false, 
    vision: false, 
    longContext: false 
  };

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    throw new Error("GeminiProvider.chat() not yet implemented — Sprint 1");
  }
}
