import { ToolDefinition, ToolContext, ToolResult } from "./types.js";

interface WebSearchInput {
  query: string;
}

export const webSearchTool: ToolDefinition<WebSearchInput> = {
  name: "web_search",
  description: "Search the web for a query.",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: `{ "query": "The search query." }`,
  async execute(input: WebSearchInput, _context: ToolContext): Promise<ToolResult> {
    if (!input.query) {
      return { ok: false, output: "Missing 'query' in input." };
    }

    return { 
      ok: false, 
      output: `Search tool is currently in mock mode.\nPlease ask the user to search this query for you manually by calling the 'ask_user_question' tool with the question: "Could you please search the web for '${input.query}' and paste the results?"` 
    };
  }
};