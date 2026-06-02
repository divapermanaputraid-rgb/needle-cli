import { describe, it } from "node:test";
import assert from "node:assert";
import { enterGitWorktreeTool, exitGitWorktreeTool } from "../../src/tools/git-worktree.js";
import { delegateTaskTool } from "../../src/tools/delegate-task.js";
import { ToolContext } from "../../src/tools/types.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);

describe("experimentation and delegation tools", () => {
  const dummyContext: ToolContext = { cwd: process.cwd() };

  describe("agent.delegate", () => {
    it("returns mock success message", async () => {
      const result = await delegateTaskTool.execute({ task: "test task", context: "test context" }, dummyContext);
      assert.strictEqual(result.ok, true);
      assert.match(result.output, /The subagent completed the task successfully/i);
    });
  });

  describe("git worktree tools", () => {
    // Only run if we are in a git repo
    it("can enter and exit a worktree", async () => {
      try {
        await execAsync("git rev-parse --is-inside-work-tree");
      } catch (e) {
        console.warn("Skipping git worktree test: not in a git repository");
        return;
      }

      const branchName = `test-branch-${Date.now()}`;
      
      // Enter
      const enterResult = await enterGitWorktreeTool.execute({ branchName }, dummyContext);
      assert.strictEqual(enterResult.ok, true);
      assert.match(enterResult.output, /created successfully/i);
      
      const worktreePath = path.resolve(dummyContext.cwd, "../.needle/worktrees", branchName);
      assert.ok(await fs.stat(worktreePath).then(s => s.isDirectory()).catch(() => false));

      // Exit (merge: false)
      const exitResult = await exitGitWorktreeTool.execute({ branchName, merge: false }, dummyContext);
      assert.strictEqual(exitResult.ok, true);
      assert.match(exitResult.output, /cleanup completed successfully/i);
      
      // Verify cleanup
      assert.ok(!(await fs.stat(worktreePath).catch(() => null)));
    });
  });
});
