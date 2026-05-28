import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ToolDefinition } from "./types.js";

const execAsync = promisify(exec);

export interface GitDiffInput {
  target?: string; // branch, commit, or empty for working dir
  file?: string; // specific file to diff
  contextLines?: number; // number of context lines
}

export const gitDiffTool: ToolDefinition<GitDiffInput> = {
  name: "git.diff",
  description: "Get git diff for the repository",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "target?": "string", "file?": "string", "contextLines?": "number" }',
  async execute(input, context) {
    try {
      // First check if it's a git repository
      try {
        await execAsync("git rev-parse --is-inside-work-tree", { cwd: context.cwd });
      } catch (e) {
        return { ok: false, output: "Error: Not a git repository." };
      }

      let cmd = "git diff";
      const args: string[] = [];

      // Unified diff context lines
      const contextLines = input.contextLines ?? 3;
      args.push(`-U${contextLines}`);

      // Optional target branch/commit
      if (input.target) {
        // Basic sanitization for target
        if (/^[a-zA-Z0-9_\-\.\^\~:]+$/.test(input.target)) {
          args.push(input.target);
        } else {
          return { ok: false, output: "Error: Invalid git target format." };
        }
      }

      // Optional file filter
      if (input.file) {
        args.push("--");
        args.push(`"${input.file.replace(/"/g, '\\"')}"`);
      }

      const fullCmd = `${cmd} ${args.join(" ")}`;

      const { stdout, stderr } = await execAsync(fullCmd, { 
        cwd: context.cwd,
        maxBuffer: 10 * 1024 * 1024 // 10MB max diff size
      });

      if (stderr && !stdout) {
        return { ok: false, output: `Git Error: ${stderr.trim()}` };
      }

      if (!stdout.trim()) {
        return { ok: true, output: "No changes." };
      }

      return {
        ok: true,
        output: stdout,
        metadata: {
          hasChanges: true
        }
      };
    } catch (error) {
      if (error instanceof Error && (error as any).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        return { ok: false, output: "Error: Diff output too large (exceeds 10MB limit)." };
      }
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};