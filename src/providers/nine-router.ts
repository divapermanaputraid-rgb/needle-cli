// FungiCode 9Router Provider — Sprint 0 placeholder
// 9Router is a multi-model routing API
import type { Provider, ProviderId, ModelProfile, ChatRequest, ChatResponse } from "./types.js";

export class NineRouterProvider implements Provider {
  id: ProviderId = "nine-router";
  displayName = "9Router";
  supports = { 
    chat: true, 
    streaming: false, 
    toolCalling: false, 
    jsonSchema: false, 
    vision: false, 
    longContext: false 
  };

  isAvailable(): boolean {
    return !!process.env.NINE_ROUTER_API_KEY;
  }

  async chat(_req: ChatRequest): Promise<ChatResponse> {
    throw new Error("NineRouterProvider.chat() not yet implemented — Sprint 1");
  }
}
