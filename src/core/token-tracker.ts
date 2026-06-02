import type { ChatMessage } from "../providers/types.js";

/**
 * Heuristic estimate of token count for a string.
 * Uses 4 chars per token as a rough average.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total token count for an array of messages.
 */
export function calculateMessagesTokenCount(messages: ChatMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
}