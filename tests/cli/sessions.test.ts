import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import { Command } from "commander";
import { sessionsCommand } from "../../src/cli/commands/sessions.js";
import { appendSessionRecord, SessionRecord } from "../../src/core/session.js";

describe("CLI sessions command", () => {
  let tmpDir: string;
  let originalCwd: () => string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-test-cli-sessions-"));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  after(async () => {
    process.cwd = originalCwd;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("registers command correctly", () => {
    const program = new Command();
    program.addCommand(sessionsCommand());
    const sessions = program.commands.find((c) => c.name() === "sessions");
    assert.ok(sessions);
    assert.ok(sessions.commands.find((c) => c.name() === "list"));
    assert.ok(sessions.commands.find((c) => c.name() === "last"));
    assert.ok(sessions.commands.find((c) => c.name() === "show"));
  });

  test("last handles no sessions", async () => {
    // We mock console.log to capture output
    const originalLog = console.log;
    let output = "";
    console.log = (msg: string) => { output += msg + "\n"; };
    
    try {
      const cmd = sessionsCommand();
      await cmd.parseAsync(["node", "test", "last"]);
      assert.match(output, /No sessions found\./);
    } finally {
      console.log = originalLog;
    }
  });

  test("show handles no match", async () => {
    const originalLog = console.log;
    let output = "";
    console.log = (msg: string) => { output += msg + "\n"; };
    
    try {
      const cmd = sessionsCommand();
      await cmd.parseAsync(["node", "test", "show", "missing-id"]);
      assert.match(output, /Session not found: missing-id/);
    } finally {
      console.log = originalLog;
    }
  });

  test("show finds exact id and handles ambiguous prefix", async () => {
    const rec1: SessionRecord = {
      id: "abc-123",
      createdAt: new Date().toISOString(),
      mode: "plan",
      task: "t1",
      cwd: tmpDir,
      status: "success",
      durationMs: 100,
      summary: "sum 1"
    };
    const rec2: SessionRecord = {
      id: "abc-456",
      createdAt: new Date().toISOString(),
      mode: "code",
      task: "t2",
      cwd: tmpDir,
      status: "failure",
      durationMs: 200,
      summary: "sum 2"
    };
    await appendSessionRecord(tmpDir, rec1);
    await appendSessionRecord(tmpDir, rec2);

    const originalLog = console.log;
    let output = "";
    console.log = (msg: string) => { output += msg + "\n"; };
    
    try {
      const cmd = sessionsCommand();
      
      // Test exact match
      await cmd.parseAsync(["node", "test", "show", "abc-123"]);
      assert.match(output, /id:\s+abc-123/);
      assert.match(output, /mode:\s+plan/);
      
      // Reset output
      output = "";
      
      // Test ambiguous prefix
      await cmd.parseAsync(["node", "test", "show", "abc"]);
      assert.match(output, /Ambiguous session ID prefix: abc\. Matches:/);
      assert.match(output, /abc-123/);
      assert.match(output, /abc-456/);

    } finally {
      console.log = originalLog;
    }
  });

});