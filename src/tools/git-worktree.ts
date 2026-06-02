import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import * as fs from "node:fs/promises";

const execAsync = promisify(exec);

interface EnterGitWorktreeInput {
  branchName: string;
}

export const enterGitWorktreeTool: ToolDefinition<EnterGitWorktreeInput> = {
  name: "git_enter_worktree",
  description: "Create an isolated Git worktree sandbox to experiment safely without affecting the main branch.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: `{ "branchName": "Name of the new branch and worktree directory" }`,
  async execute(input: EnterGitWorktreeInput, context: ToolContext): Promise<ToolResult> {
    if (!input.branchName) {
      return { ok: false, output: "Missing 'branchName' in input." };
    }

    const worktreeBaseDir = path.resolve(context.cwd, "../.needle/worktrees");
    const worktreePath = path.join(worktreeBaseDir, input.branchName);

    try {
      await fs.mkdir(worktreeBaseDir, { recursive: true });
      
      const cmd = `git worktree add "${worktreePath}" -b "${input.branchName}"`;
      const { stdout, stderr } = await execAsync(cmd, { cwd: context.cwd });

      return {
        ok: true,
        output: `Worktree created successfully at ${worktreePath}.\nStdout: ${stdout}\nStderr: ${stderr}\n\n[SYSTEM NOTE]: To execute commands in this sandbox, make sure to pass ${worktreePath} as the 'cwd' in your tool calls (e.g., shell or file tools).`
      };
    } catch (err: any) {
      return { ok: false, output: `Failed to create git worktree: ${err.message || String(err)}` };
    }
  }
};

interface ExitGitWorktreeInput {
  branchName: string;
  merge: boolean;
}

export const exitGitWorktreeTool: ToolDefinition<ExitGitWorktreeInput> = {
  name: "git_exit_worktree",
  description: "Remove a git worktree sandbox and optionally merge its changes into the main branch.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: `{ "branchName": "The name of the branch/worktree to exit", "merge": "Boolean indicating whether to merge changes back to the current branch" }`,
  async execute(input: ExitGitWorktreeInput, context: ToolContext): Promise<ToolResult> {
    if (!input.branchName || typeof input.merge !== "boolean") {
      return { ok: false, output: "Missing 'branchName' or 'merge' (boolean) in input." };
    }

    const worktreeBaseDir = path.resolve(context.cwd, "../.needle/worktrees");
    const worktreePath = path.join(worktreeBaseDir, input.branchName);

    try {
      let outputLogs = "";

      if (input.merge) {
        outputLogs += `Attempting to merge branch '${input.branchName}'...\n`;
        const { stdout: mergeOut, stderr: mergeErr } = await execAsync(`git merge ${input.branchName}`, { cwd: context.cwd });
        outputLogs += `Merge Output:\n${mergeOut}\n${mergeErr}\n\n`;
      }

      outputLogs += `Removing worktree at '${worktreePath}'...\n`;
      const { stdout: rmOut, stderr: rmErr } = await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: context.cwd });
      outputLogs += `Remove Output:\n${rmOut}\n${rmErr}\n\n`;

      outputLogs += `Deleting branch '${input.branchName}'...\n`;
      const { stdout: delOut, stderr: delErr } = await execAsync(`git branch -D "${input.branchName}"`, { cwd: context.cwd });
      outputLogs += `Branch Delete Output:\n${delOut}\n${delErr}`;

      return {
        ok: true,
        output: `Worktree cleanup completed successfully.\n\n${outputLogs}`
      };
    } catch (err: any) {
      return { ok: false, output: `Failed to exit git worktree: ${err.message || String(err)}` };
    }
  }
};