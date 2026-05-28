// FungiCode tool: file-edit — Sprint 0 placeholder
import type { Tool, ToolInput, ToolResult, ToolContext } from "./types.js";

export const fileeditTool: Tool = {
  name: "file-edit",
  description: "TODO: implement file-edit — Sprint 1",
  riskLevel: "low",
  isReadOnly: false,
  inputSchemaDescription: "TODO: implement file-edit schema",
  async execute(_input: ToolInput, _context: ToolContext): Promise<ToolResult> {
    return { ok: false, output: "file-edit not yet implemented — Sprint 1" };
  },
};
