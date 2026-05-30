import { test, describe, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { execSync } from "node:child_process";
import { runDiffReview } from "../../src/review/diff-reviewer.js";
import type { ChatMessage, ChatResponse } from "../../src/providers/types.js";

describe("Diff Reviewer", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-review-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns error if not a git repo", async () => {
    const res = await runDiffReview({
      cwd: tmpDir,
      providerChat: async () => ({ content: "review", model: "test", provider: "openai-compatible" }),
    });

    assert.equal(res.ok, false);
    assert.match(res.review, /Not a git repository/);
    assert.equal(res.diffBytes, 0);
  });

  test("returns clean message if no diff", async () => {
    execSync("git init", { cwd: tmpDir });
    
    const res = await runDiffReview({
      cwd: tmpDir,
      providerChat: async () => ({ content: "review", model: "test", provider: "openai-compatible" }),
    });

    assert.equal(res.ok, false);
    assert.match(res.review, /No unstaged changes/);
    assert.equal(res.diffBytes, 0);
  });

  test("handles staged mode with no diff", async () => {
    execSync("git init", { cwd: tmpDir });
    
    const res = await runDiffReview({
      cwd: tmpDir,
      staged: true,
      providerChat: async () => ({ content: "review", model: "test", provider: "openai-compatible" }),
    });

    assert.equal(res.ok, false);
    assert.match(res.review, /No staged changes/);
    assert.equal(res.diffBytes, 0);
  });

  test("truncates large diffs", async () => {
    execSync("git init", { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "file.txt"), "a".repeat(2000));
    execSync("git add file.txt", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });
    
    await fs.writeFile(path.join(tmpDir, "file.txt"), "b".repeat(2000));
    
    let capturedMessages: ChatMessage[] = [];
    const res = await runDiffReview({
      cwd: tmpDir,
      maxDiffBytes: 100, // Small limit to trigger truncation
      providerChat: async (msgs) => {
        capturedMessages = msgs;
        return { content: "review", model: "test", provider: "openai-compatible" };
      },
    });

    assert.equal(res.ok, true);
    assert.equal(res.truncated, true);
    assert.ok(res.diffBytes > 100);
    
    const userPrompt = capturedMessages.find(m => m.role === "user")?.content || "";
    assert.match(userPrompt, /truncated/);
  });

  test("uses reviewer profile by default and invokes providerChat", async () => {
    execSync("git init", { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "file.txt"), "a");
    execSync("git add file.txt", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });
    
    await fs.writeFile(path.join(tmpDir, "file.txt"), "b");
    
    let capturedMessages: ChatMessage[] = [];
    const res = await runDiffReview({
      cwd: tmpDir,
      providerChat: async (msgs) => {
        capturedMessages = msgs;
        return { content: "# Review Summary\nLooks good", model: "test", provider: "openai-compatible" };
      },
    });

    assert.equal(res.ok, true);
    assert.equal(res.profile, "reviewer");
    assert.equal(res.review, "# Review Summary\nLooks good");
    
    const sysPrompt = capturedMessages.find(m => m.role === "system")?.content || "";
    assert.match(sysPrompt, /You are Needle, an expert code reviewer/);
    assert.match(sysPrompt, /Do not apply patches/);
    
    const userPrompt = capturedMessages.find(m => m.role === "user")?.content || "";
    assert.match(userPrompt, /Unstaged/);

    const sessionsRaw = await fs.readFile(path.join(tmpDir, ".needle", "sessions", "runs.jsonl"), "utf-8");
    const sessions = sessionsRaw.trim().split("\n").map(l => JSON.parse(l));
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].mode, "review");
    assert.equal(sessions[0].task, "review unstaged diff");
    assert.equal(sessions[0].status, "success");
    assert.ok(sessions[0].summary.includes("Looks good"));
  });

  test("supports staged mode", async () => {
    execSync("git init", { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "file.txt"), "a");
    execSync("git add file.txt", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });
    
    await fs.writeFile(path.join(tmpDir, "file.txt"), "b");
    execSync("git add file.txt", { cwd: tmpDir });
    
    let capturedMessages: ChatMessage[] = [];
    const res = await runDiffReview({
      cwd: tmpDir,
      staged: true,
      providerChat: async (msgs) => {
        capturedMessages = msgs;
        return { content: "review", model: "test", provider: "openai-compatible" };
      },
    });

    assert.equal(res.ok, true);
    assert.equal(res.staged, true);
    
    const userPrompt = capturedMessages.find(m => m.role === "user")?.content || "";
    assert.match(userPrompt, /Staged/);
  });
});