import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface DirCreateInput {
  path: string;
}

export const dirCreateTool: ToolDefinition<DirCreateInput> = {
  name: "dir.create",
  description: "Create a directory inside the workspace.",
  riskLevel: "low",
  isReadOnly: false,
  inputSchemaDescription: '{ "path": "string" }',
  validate(input, context) {
    if (!input.path) {
      return { ok: false, output: "Error: Missing path." };
    }
    const targetPath = path.resolve(context.cwd, input.path);
    if (!targetPath.startsWith(path.resolve(context.cwd))) {
      return { ok: false, output: "Error: Path traversal detected." };
    }
    return null; // OK
  },
  async execute(input, context) {
    try {
      const targetPath = path.resolve(context.cwd, input.path);
      
      let exists = false;
      try {
        const stat = await fs.stat(targetPath);
        exists = true;
        if (!stat.isDirectory()) {
          return { ok: false, output: "Error: Path exists and is not a directory." };
        }
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }

      if (exists) {
        return { ok: true, output: `Directory already exists: ${input.path}`, metadata: { created: false } };
      }

      await fs.mkdir(targetPath, { recursive: true });

      return {
        ok: true,
        output: `Successfully created directory ${input.path}`,
        metadata: {
          path: input.path,
          created: true
        }
      };
    } catch (error) {
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};