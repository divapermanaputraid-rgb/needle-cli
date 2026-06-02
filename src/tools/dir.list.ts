import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

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
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const list = entries.map(e => `${e.isDirectory() ? '[DIR] ' : '[FILE] '}${e.name}`);
      return {
        ok: true,
        output: list.join('\n') || "(empty directory)",
      };
    } catch (e: any) {
      return { ok: false, output: `Error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  },
};