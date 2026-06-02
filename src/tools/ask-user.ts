import * as readline from "node:readline/promises";
import { ToolDefinition, ToolContext, ToolResult } from "./types.js";

interface AskUserQuestionInput {
  question: string;
}

export const askUserQuestionTool: ToolDefinition<AskUserQuestionInput> = {
  name: "ask_user_question",
  description: "Ask the human user a question to get clarification, confirm an assumption, or request manual intervention. Use this when stuck or unsure. Do NOT guess.",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: `{ "question": "The explicit question to ask the user." }`,
  async execute(input: AskUserQuestionInput, _context: ToolContext): Promise<ToolResult> {
    if (!input.question) {
      return { ok: false, output: "Missing 'question' in input." };
    }

    if (!process.stdin.isTTY) {
      return { 
        ok: false, 
        output: "Execution environment is non-interactive (no TTY). Cannot ask human for input. Proceed using your best judgment or fail safely."
      };
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\n\x1b[36m[Agent Question]\x1b[0m");
      const answer = await rl.question(`\x1b[36m${input.question}\x1b[0m\n> `);
      return {
        ok: true,
        output: `User replied: ${answer}`,
      };
    } catch (err) {
      return {
        ok: false,
        output: `Failed to get user input: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      rl.close();
    }
  },
};