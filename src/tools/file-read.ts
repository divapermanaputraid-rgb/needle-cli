import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface FileReadInput {
  path: string;
  maxBytes?: number;
}

const FORBIDDEN_PATTERNS = [
  /(^|\/)\.env(\..+)?$/,
  /(^|\/)\.git\//,
  /(^|\/)id_rsa/,
  /(^|\/)aws\/credentials/,
];

export const fileReadTool: ToolDefinition<FileReadInput> = {
  name: "file.read",
  description: "Read the contents of a text file securely",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "path": "string", "maxBytes?": "number" }',
  async execute(input, context) {
    try {
      const targetPath = path.resolve(context.cwd, input.path);
      if (!targetPath.startsWith(path.resolve(context.cwd))) {
        return { ok: false, output: "Error: Path traversal detected." };
      }

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(targetPath)) {
          return { ok: false, output: "Error: Attempted to read a forbidden file." };
        }
      }

      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
        return { ok: false, output: "Error: Path is not a file." };
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
          output,
          metadata: {
            truncated: true,
            bytesRead,
            totalBytes: stat.size,
          },
        };
      }

      return {
        ok: true,
        output,
        metadata: {
          truncated: false,
          bytesRead,
          totalBytes: stat.size,
        },
      };
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return { ok: false, output: "Error: File not found." };
      }
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};