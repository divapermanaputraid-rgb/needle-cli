import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { appendSessionRecord, readRecentSessions, findSessionById, redactSessionText, SessionRecord } from "../../src/core/session.js";

test("session logging", async (t) => {
  const tempDirs: string[] = [];

  const setupTempDir = async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-session-test-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  t.after(async () => {
    for (const dir of tempDirs) {
      // Ensure directory permissions are restored before cleaning up
      try {
        const sessionDir = path.join(dir, ".needle", "sessions");
        await fs.chmod(sessionDir, 0o755).catch(() => {});
      } catch (err) {}
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  await t.test("appendSessionRecord creates .needle/sessions if missing and writes one JSONL line", async () => {
    const cwd = await setupTempDir();

    const record: SessionRecord = {
      id: "run_1",
      createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
      mode: "code",
      task: "first task",
      cwd,
      status: "success",
      durationMs: 100,
      summary: "First summary",
    };

    const res = await appendSessionRecord(cwd, record);
    assert.equal(res.ok, true);

    const logPath = path.join(cwd, ".needle", "sessions", "runs.jsonl");
    const content = await fs.readFile(logPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.id, "run_1");
  });

  await t.test("appendSessionRecord appends multiple records safely", async () => {
    const cwd = await setupTempDir();

    const record1: SessionRecord = {
      id: "run_1",
      createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
      mode: "code",
      task: "first task",
      cwd,
      status: "success",
      durationMs: 100,
      summary: "First summary",
    };

    const record2: SessionRecord = {
      id: "run_2",
      createdAt: new Date("2024-01-01T11:00:00Z").toISOString(),
      mode: "plan",
      task: "second task",
      cwd,
      status: "failure",
      durationMs: 200,
      summary: "Second summary",
    };

    await appendSessionRecord(cwd, record1);
    await appendSessionRecord(cwd, record2);

    const logPath = path.join(cwd, ".needle", "sessions", "runs.jsonl");
    const content = await fs.readFile(logPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).id, "run_1");
    assert.equal(JSON.parse(lines[1]).id, "run_2");

    const sessions = await readRecentSessions(cwd);
    assert.equal(sessions.length, 2);
    // Should be newest first
    assert.equal(sessions[0].id, "run_2");
    assert.equal(sessions[1].id, "run_1");
  });

  await t.test("malformed JSONL lines are ignored", async () => {
    const cwd = await setupTempDir();
    const logPath = path.join(cwd, ".needle", "sessions", "runs.jsonl");
    await fs.mkdir(path.dirname(logPath), { recursive: true });

    // Write a valid, then malformed, then valid
    await fs.writeFile(logPath, [
      JSON.stringify({ id: "run_1", mode: "plan", createdAt: new Date("2024-01-01T10:00:00Z").toISOString() }),
      "NOT A JSON LINE",
      "{ malformed json }",
      JSON.stringify({ id: "run_2", mode: "code", createdAt: new Date("2024-01-01T11:00:00Z").toISOString() }),
    ].join("\n") + "\n");

    const sessions = await readRecentSessions(cwd);
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].id, "run_2");
    assert.equal(sessions[1].id, "run_1");
  });

  await t.test("session log redacts API keys and secrets", async () => {
    const input = "Here is my key: sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef and a bearer token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz. also NINE_ROUTER_API_KEY=abc123def456xyz7890123456";
    const redacted = redactSessionText(input);

    assert.ok(!redacted.includes("sk-ant-api03-"), "Anthropic key should be redacted");
    assert.ok(!redacted.includes("Bearer eyJhbGci"), "Bearer token should be redacted");
    assert.ok(!redacted.includes("abc123def456xyz7890123456"), "Secret variable should be redacted");
    assert.ok(redacted.includes("***"));
  });

  await t.test("session log does not include secrets.local.json values", async () => {
    const cwd = await setupTempDir();
    const secretsPath = path.join(cwd, ".needle", "secrets.local.json");
    await fs.mkdir(path.dirname(secretsPath), { recursive: true });
    await fs.writeFile(secretsPath, JSON.stringify({
      "LOCAL_API_KEY": "super-secret-local-value-xyz789"
    }));

    process.env["DUMMY_ENV_SECRET"] = "dummy-env-secret-value-abc123";

    const input = "I used super-secret-local-value-xyz789 and dummy-env-secret-value-abc123 to authenticate.";
    const redacted = redactSessionText(input, 8192, cwd);

    assert.ok(!redacted.includes("super-secret-local-value-xyz789"), "Local secret value should be redacted");
    assert.ok(!redacted.includes("dummy-env-secret-value-abc123"), "Env secret value should be redacted");
    assert.ok(redacted.includes("***"));
  });

  await t.test("appendSessionRecord bounds long summaries", async () => {
    const cwd = await setupTempDir();

    const longSummary = "a".repeat(10 * 1024); // 10KB
    const record: SessionRecord = {
      id: "run_1",
      createdAt: new Date().toISOString(),
      mode: "code",
      task: "task",
      cwd,
      status: "success",
      durationMs: 100,
      summary: longSummary,
    };

    await appendSessionRecord(cwd, record);

    const sessions = await readRecentSessions(cwd);
    assert.equal(sessions.length, 1);
    assert.ok(sessions[0].summary.length <= 8 * 1024 + 100, "Summary should be truncated to ~8KB");
    assert.ok(sessions[0].summary.includes("(truncated)"));
  });

  await t.test("appendSessionRecord handles unwritable directory without throwing raw crash", async () => {
    const cwd = await setupTempDir();

    // Make the directory read-only so logging fails
    const dirPath = path.join(cwd, ".needle", "sessions");
    await fs.mkdir(dirPath, { recursive: true });
    await fs.chmod(dirPath, 0o444);

    const record: SessionRecord = {
      id: "run_1",
      createdAt: new Date().toISOString(),
      mode: "code",
      task: "task",
      cwd,
      status: "success",
      durationMs: 100,
      summary: "summary",
    };

    // Should not throw, should return ok: false
    let result: { ok: boolean; warning?: string } = { ok: true };
    await assert.doesNotReject(async () => {
      result = await appendSessionRecord(cwd, record);
    });

    assert.equal(result.ok, false);
    assert.ok(result.warning?.includes("Could not write session log"));

    // Cleanup so it can be deleted
    await fs.chmod(dirPath, 0o755);
  });

  await t.test("findSessionById finds exact and prefix matches", async () => {
    const cwd = await setupTempDir();

    const record1: SessionRecord = {
      id: "run-abc-123",
      createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
      mode: "code",
      task: "first task",
      cwd,
      status: "success",
      durationMs: 100,
      summary: "First summary",
    };

    const record2: SessionRecord = {
      id: "run-abc-456",
      createdAt: new Date("2024-01-01T11:00:00Z").toISOString(),
      mode: "plan",
      task: "second task",
      cwd,
      status: "failure",
      durationMs: 200,
      summary: "Second summary",
    };

    await appendSessionRecord(cwd, record1);
    await appendSessionRecord(cwd, record2);

    // Exact match
    const res1 = await findSessionById(cwd, "run-abc-123");
    assert.ok(res1.match);
    assert.equal(res1.match.id, "run-abc-123");

    // Prefix match (unique)
    const res2 = await findSessionById(cwd, "run-abc-4");
    assert.ok(res2.match);
    assert.equal(res2.match.id, "run-abc-456");

    // Ambiguous prefix
    const res3 = await findSessionById(cwd, "run-abc");
    assert.equal(res3.match, undefined);
    assert.equal(res3.matches.length, 2);

    // No match
    const res4 = await findSessionById(cwd, "missing");
    assert.equal(res4.match, undefined);
    assert.equal(res4.matches.length, 0);
  });

});
