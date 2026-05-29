import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface FileWriteInput {
  path: string;
  content: string;
  createDirs?: boolean;
  overwrite?: boolean;
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

export const fileWriteTool: ToolDefinition<FileWriteInput> = {
  name: "file.write",
  description: "Write content to a file safely. Creates missing directories if createDirs=true. Overwrites existing files only if overwrite=true.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: '{ "path": "string", "content": "string", "createDirs?": "boolean", "overwrite?": "boolean" }',
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
        return { ok: false, output: "Error: Attempted to write to a protected path." };
      }
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
        if (!stat.isFile()) {
           return { ok: false, output: "Error: Path exists and is not a file." };
        }
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }

      if (exists && !input.overwrite) {
        return { ok: false, output: "Error: File already exists. Pass overwrite=true to overwrite." };
      }

      if (input.createDirs) {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
      }

      await fs.writeFile(targetPath, input.content, "utf8");

      return {
        ok: true,
        output: `Successfully wrote ${Buffer.byteLength(input.content, 'utf8')} bytes to ${input.path}`,
        metadata: {
          path: input.path,
          bytesWritten: Buffer.byteLength(input.content, 'utf8'),
          created: !exists,
          overwritten: exists
        }
      };

    } catch (error) {
       if ((error as any).code === "ENOENT") {
        return { ok: false, output: "Error: Directory does not exist. Pass createDirs=true to create it." };
      }
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};
