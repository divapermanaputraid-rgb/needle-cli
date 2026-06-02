import type { ChatMessage } from "../providers/types.js";
import { calculateMessagesTokenCount } from "./token-tracker.js";

/**
 * Compacts the conversation history if it exceeds maxTokens.
 * Keeps the system prompt, the initial task, and the most recent context.
 */
export function compactMessages(
  messages: ChatMessage[],
  maxTokens: number,
  recentCount: number = 6
): ChatMessage[] {
  const currentTokens = calculateMessagesTokenCount(messages);

  if (currentTokens <= maxTokens || messages.length <= (recentCount + 2)) {
    return messages;
  }

  const systemPrompt = messages[0];
  const initialTask = messages[1];
  const recentMessages = messages.slice(-recentCount);

  const compactedMessage: ChatMessage = {
    role: "user",
    content: "[SYSTEM NOTE: Previous iterations were compacted to save context window. Continue executing your task.]"
  };

  return [
    systemPrompt,
    initialTask,
    compactedMessage,
    ...recentMessages
  ];
}