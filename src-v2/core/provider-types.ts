export interface NativeTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>; // JSON Schema
}

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly arguments: string; // JSON string
  };
}

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string | null;
  readonly tool_calls?: readonly ToolCall[];
  readonly tool_call_id?: string;
}

export interface ChatResponse {
  readonly content: string | null;
  readonly tool_calls?: readonly ToolCall[];
}
