import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition, ToolResult } from "./types.js";
import { resolveWorkspacePath } from "../runtime/workspace/path-resolver.js";

export interface DirListInput {
  path: string;
}

export const dirListTool: ToolDefinition<DirListInput> = {
  name: "dir.list",
  description: "List contents of a directory.",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "path": "string" }',
  validate(input, context) {
    if (!input.path) {
      return { ok: false, tool: "dir.list", error: "Missing path." };
    }
    const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
    if (!resolveResult.ok) {
      return { ok: false, tool: "dir.list", error: `${resolveResult.reason }` };
    }
    return null;
  },
  async execute(input, context): Promise<ToolResult> {
    try {
      const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
      if (!resolveResult.ok || !resolveResult.normalizedPath) {
        return { ok: false, tool: "dir.list", error: `${resolveResult.reason || "Invalid path" }` };
      }
      const targetPath = resolveResult.normalizedPath;
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const list = entries.map(e => `${e.isDirectory() ? '[DIR] ' : '[FILE] '}${e.name}`);
      return { ok: true, tool: "dir.list", result: list, metadata: { count: list.length } };
    } catch (e: any) {
      return { ok: false, tool: "dir.list", error: `${e instanceof Error ? e.message : "Unknown error" }` };
    }
  },
};