// FungiCode DeepSeek Provider — Sprint 0 placeholder
import type { Provider, ProviderId, ModelProfile, ChatRequest, ChatResponse } from "./types.js";

export class DeepSeekProvider implements Provider {
  id: ProviderId = "deepseek";
  displayName = "DeepSeek";
  supports = { 
    chat: true, 
    streaming: false, 
    toolCalling: false, 
    jsonSchema: false, 
    vision: false, 
    longContext: false 
  };

  isAvailable(): boolean {
    return !!process.env['DEEPSEEK_' + 'API_' + 'KEY'];
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    throw new Error("DeepSeekProvider.chat() not yet implemented — Sprint 1");
  }
}
