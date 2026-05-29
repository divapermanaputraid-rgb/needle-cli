import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface FileEditInput {
  path: string;
  search: string;
  replace: string;
  replaceAll?: boolean;
}

const FORBIDDEN_PATTERNS = [
  /(^|\/)\.env(\..+)?$/,
  /(^|\/)\.git\//,
  /(^|\/)\.ssh\//,
  /(^|\/)\.npmrc$/,
  /(^|\/)\.pypirc$/,
  /(^|\/)\.needle\/config\.json$/,
  /(^|\/)id_rsa/,
  /(^|\/)aws\/credentials/,
];

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
    const targetPath = path.resolve(context.cwd, input.path);
    if (!targetPath.startsWith(path.resolve(context.cwd))) {
      return { ok: false, output: "Error: Path traversal detected." };
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(targetPath)) {
        return { ok: false, output: "Error: Attempted to edit a protected path." };
      }
    }
    return null; // OK
  },
  async execute(input, context) {
    try {
      if (!input.search) {
        return { ok: false, output: "Error: Missing search string." };
      }

      const targetPath = path.resolve(context.cwd, input.path);

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
