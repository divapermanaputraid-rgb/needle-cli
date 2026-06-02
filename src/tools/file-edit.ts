import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition, ToolResult } from "./types.js";
import { resolveWorkspacePath } from "../runtime/workspace/path-resolver.js";

export interface FileEditInput {
  path: string;
  search: string;
  replace: string;
  replaceAll?: boolean;
}

export const fileEditTool: ToolDefinition<FileEditInput> = {
  name: "file.edit",
  description: "Edit a file by replacing a search string with a new string. Use replaceAll=true to replace all occurrences.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: '{ "path": "string", "search": "string", "replace": "string", "replaceAll?": "boolean" }',
  validate(input, context) {
    if (!input.path) {
      return { ok: false, output: "Error: Missing path." };
    }
    const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: true });
    if (!resolveResult.ok) {
      return { ok: false, output: `Error: ${resolveResult.reason}` };
    }
    return null; // OK
  },
  async execute(input, context): Promise<ToolResult> {
    try {
      if (!input.search) {
        return { ok: false, output: "Error: Missing search string." };
      }

      const resolveResult = resolveWorkspacePath(context.cwd, input.path, { isWrite: true });
      if (!resolveResult.ok || !resolveResult.normalizedPath) {
        return { ok: false, output: `Error: ${resolveResult.reason || "Invalid path"}` };
      }
      const targetPath = resolveResult.normalizedPath;

      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
         return { ok: false, output: "Error: Path exists and is not a file." };
      }

      const content = await fs.readFile(targetPath, "utf8");
      
      let newContent = content;
      let replacements = 0;

      if (input.replaceAll) {
         // Using split/join to replace all occurrences avoiding regex escaping issues
         const parts = content.split(input.search);
         if (parts.length > 1) {
            replacements = parts.length - 1;
            newContent = parts.join(input.replace);
         }
      } else {
         const idx = content.indexOf(input.search);
         if (idx !== -1) {
            replacements = 1;
            newContent = content.substring(0, idx) + input.replace + content.substring(idx + input.search.length);
         }
      }

      if (replacements === 0) {
         return { ok: false, output: "Error: Search string not found in file." };
      }

      await fs.writeFile(targetPath, newContent, "utf8");

      return {
        ok: true,
        output: `Successfully made ${replacements} replacement(s) in ${input.path}`,
        metadata: {
          path: input.path,
          replacements,
          bytesBefore: Buffer.byteLength(content, 'utf8'),
          bytesAfter: Buffer.byteLength(newContent, 'utf8')
        }
      };

    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return { ok: false, output: "Error: File not found." };
      }
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};
