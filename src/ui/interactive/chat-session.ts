import type { ChatMessage } from '../../providers/types';

export class ChatSession {
  private history: ChatMessage[] = [];
  private readonly maxMessages: number;

  constructor(maxTurns: number = 10) {
    // 1 turn = 1 user message + 1 assistant message, so maxTurns * 2
    this.maxMessages = maxTurns * 2;
  }

  addMessage(message: ChatMessage): void {
    this.history.push(message);
    if (this.history.length > this.maxMessages) {
      this.history = this.history.slice(this.history.length - this.maxMessages);
    }
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}