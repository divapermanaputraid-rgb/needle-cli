import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

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
      return { ok: false, output: "Error: Missing path." };
    }
    const targetPath = path.resolve(context.cwd, input.path);
    if (!targetPath.startsWith(path.resolve(context.cwd))) {
      return { ok: false, output: "Error: Path traversal detected." };
    }
    return null;
  },
  async execute(input, context) {
    try {
      const targetPath = path.resolve(context.cwd, input.path);
      const stat = await fs.stat(targetPath);
      return {
        ok: true,
        output: stat.isDirectory() ? "true" : "false",
        metadata: { exists: stat.isDirectory() }
      };
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return { ok: true, output: "false", metadata: { exists: false } };
      }
      return { ok: false, output: `Error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  },
};