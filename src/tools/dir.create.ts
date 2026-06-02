import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition, ToolResult } from "./types.js";
import { resolveWorkspacePath } from "../runtime/workspace/path-resolver.js";

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
      return { ok: false, tool: "dir.create", error: "Missing path." };
    }
    const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: true });
    if (!resolveResult.ok) {
      return { ok: false, tool: "dir.create", error: `${resolveResult.reason }` };
    }
    return null; // OK
  },
  async execute(input, context): Promise<ToolResult> {
    try {
      const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: true });
      if (!resolveResult.ok || !resolveResult.normalizedPath) {
        return { ok: false, tool: "dir.create", error: `${resolveResult.reason || "Invalid path" }` };
      }
      const targetPath = resolveResult.normalizedPath;
      
      let exists = false;
      try {
        const stat = await fs.stat(targetPath);
        exists = true;
        if (!stat.isDirectory()) {
          return { ok: false, tool: "dir.create", error: "Path exists and is not a directory." };
        }
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }

      if (exists) {
        return { ok: true, tool: "dir.create", result: `Directory already exists: ${input.path }`, metadata: { created: false } };
      }

      await fs.mkdir(targetPath, { recursive: true });

      return { ok: true, tool: "dir.create", result: `Successfully created directory ${input.path }`,
        metadata: {
          path: input.path,
          created: true
        }
      };
    } catch (error) {
      return { ok: false, tool: "dir.create", error: `${error instanceof Error ? error.message : "Unknown error" }` };
    }
  },
};