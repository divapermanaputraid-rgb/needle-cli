import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition, ToolResult } from "./types.js";
import { resolveWorkspacePath } from "../runtime/workspace/path-resolver.js";

export interface FileReadInput {
  path: string;
  maxBytes?: number;
}

export const fileReadTool: ToolDefinition<FileReadInput> = {
  name: "file.read",
  description: "Read the contents of a text file securely",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "path": "string", "maxBytes?": "number" }',
  validate(input, context) {
    if (!input.path) {
      return { ok: false, tool: "file.read", error: "Missing path." };
    }
    const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
    if (!resolveResult.ok) {
      return { ok: false, tool: "file.read", error: `${resolveResult.reason }` };
    }
    return null;
  },
  async execute(input, context): Promise<ToolResult> {
    try {
      const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: false });
      if (!resolveResult.ok || !resolveResult.normalizedPath) {
        return { ok: false, tool: "file.read", error: `${resolveResult.reason || "Invalid path" }` };
      }
      const targetPath = resolveResult.normalizedPath;

      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
        return { ok: false, tool: "file.read", error: "Path is not a file." };
      }

      const maxBytes = input.maxBytes ?? 64 * 1024;
      const fileHandle = await fs.open(targetPath, "r");
      
      const buffer = Buffer.alloc(maxBytes);
      const { bytesRead } = await fileHandle.read(buffer, 0, maxBytes, 0);
      await fileHandle.close();

      const output = buffer.subarray(0, bytesRead).toString("utf8");

      if (stat.size > maxBytes) {
        return {
          ok: true,
          tool: "file.read",
          result: output,
          metadata: {
            truncated: true,
            bytesRead,
            totalBytes: stat.size,
          },
        };
      }

      return {
        ok: true,
        tool: "file.read",
        result: output,
        metadata: {
          truncated: false,
          bytesRead,
          totalBytes: stat.size,
        },
      };
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return { ok: false, tool: "file.read", error: "File not found." };
      }
      return { ok: false, tool: "file.read", error: `${error instanceof Error ? error.message : "Unknown error" }` };
    }
  },
};