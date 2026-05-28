// FungiCode tool: shell — Sprint 0 placeholder
import type { Tool, ToolInput, ToolResult, ToolContext } from "./types.js";

export const shellTool: Tool = {
  name: "shell",
  description: "TODO: implement shell — Sprint 1",
  riskLevel: "low",
  isReadOnly: false,
  inputSchemaDescription: "TODO: implement shell schema",
  async execute(_input: ToolInput, _context: ToolContext): Promise<ToolResult> {
    return { ok: false, output: "shell not yet implemented — Sprint 1" };
  },
};
