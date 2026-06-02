import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition, ToolResult } from "./types.js";
import { resolveWorkspacePath } from "../runtime/workspace/path-resolver.js";

export interface DirExistsInput {
  path: string;
}

export const dirExistsTool: ToolDefinition<DirExistsInput> = {
  name: "dir.exists",
  description: "Check if a directory exists.",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "path": "string" }',
  validate(input, context) {
    if (!input.path) {
      return { ok: false, tool: "dir.exists", error: "Missing path." };
    }
    const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
    if (!resolveResult.ok) {
      return { ok: false, tool: "dir.exists", error: `${resolveResult.reason }` };
    }
    return null;
  },
  async execute(input, context): Promise<ToolResult> {
    try {
      const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
      if (!resolveResult.ok || !resolveResult.normalizedPath) {
        return { ok: false, tool: "dir.exists", error: `${resolveResult.reason || "Invalid path" }` };
      }
      const targetPath = resolveResult.normalizedPath;
      const stat = await fs.stat(targetPath);
      return { ok: true, tool: "dir.exists", result: stat.isDirectory(), metadata: { exists: stat.isDirectory() } };
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return { ok: true, tool: "dir.exists", result: false, metadata: { exists: false } };
      }
      return { ok: false, tool: "dir.exists", error: `${e instanceof Error ? e.message : "Unknown error" }` };
    }
  },
};