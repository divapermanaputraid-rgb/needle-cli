// FungiCode tool: file-write — Sprint 0 placeholder
import type { Tool, ToolInput, ToolResult, ToolContext } from "./types.js";

export const filewriteTool: Tool = {
  name: "file-write",
  description: "TODO: implement file-write — Sprint 1",
  riskLevel: "low",
  isReadOnly: false,
  inputSchemaDescription: "TODO: implement file-write schema",
  async execute(_input: ToolInput, _context: ToolContext): Promise<ToolResult> {
    return { ok: false, output: "file-write not yet implemented — Sprint 1" };
  },
};
