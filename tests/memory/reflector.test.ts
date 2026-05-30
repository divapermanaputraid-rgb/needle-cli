import test from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { runReflect, buildMemoryFromSessions } from "../../src/memory/reflector.js";
import { createEmptyProjectMemory, readProjectMemory } from "../../src/memory/project-memory.js";

async function createTempSession(tmpDir: string, sessions: any[]) {
  const sessionsDir = path.join(tmpDir, ".needle", "sessions");
  await fs.mkdir(sessionsDir, { recursive: true });
  
  const runsPath = path.join(sessionsDir, "runs.jsonl");
  const data = sessions.map(s => JSON.stringify(s)).join("\n");
  await fs.writeFile(runsPath, data, "utf8");
}

test("Reflector - runReflect handles no sessions cleanly", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  const result = await runReflect({ cwd: tmpDir });
  
  assert.equal(result.sessionsRead, 0);
  assert.equal(result.proposedMemory, "");
  assert.match(result.summary, /No sessions found/);
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector LLM - empty JSON falls back to deterministic", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const mockProviderChat = async (messages: any[]) => {
    return {
      content: JSON.stringify({
        projectSummary: [],
        architectureNotes: [],
        commands: [],
        conventions: [],
        decisions: [],
        recurringIssues: [],
        todo: []
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  };

  const result = await runReflect({ 
    cwd: tmpDir, 
    llm: true, 
    providerChat: mockProviderChat 
  });

  assert.ok(result.ok);
  assert.match(result.summary, /fallback to deterministic/);

  const memPath = path.join(tmpDir, ".needle", "MEMORY.md");
  const stat = await fs.stat(memPath);
  assert.ok(stat.isFile()); // Should exist
  
  // Should have the deterministic fallback content
  const mem = await readProjectMemory(tmpDir);
  assert.ok(mem.decisions.includes("Decided to use JWT"));
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector - dry-run does not write MEMORY.md", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT\n- Architecture: REST API"
  }]);
  
  const result = await runReflect({ cwd: tmpDir, dryRun: true });
  assert.equal(result.sessionsRead, 1);
  assert.ok(result.dryRun);
  
  const memPath = path.join(tmpDir, ".needle", "MEMORY.md");
  await assert.rejects(fs.stat(memPath)); // Should not exist
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector - normal reflect writes MEMORY.md", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const result = await runReflect({ cwd: tmpDir });
  assert.equal(result.sessionsRead, 1);
  assert.ok(!result.dryRun);
  
  const memPath = path.join(tmpDir, ".needle", "MEMORY.md");
  const stat = await fs.stat(memPath);
  assert.ok(stat.isFile()); // Should exist
  
  const mem = await readProjectMemory(tmpDir);
  assert.ok(mem.decisions.includes("Decided to use JWT"));
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector - sessions are redacted before memory output", async () => {
  const mem = createEmptyProjectMemory();
  const sessions = [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Fix key sk-ant-api03-abcdef1234567890",
    mode: "code" as const,
    summary: "- Fixed it"
  }];

  const result = buildMemoryFromSessions(mem, sessions);

  // It shouldn't add secrets to memory
  const hasSecret = JSON.stringify(result).includes("sk-ant-api03");
  assert.ok(!hasSecret, "Secret should be redacted from memory");
  const hasRedacted = JSON.stringify(result).includes("***");
  assert.ok(hasRedacted, "Memory should contain ***");
});

test("Reflector - duplicate bullets are deduplicated", async () => {
  const mem = createEmptyProjectMemory();
  const sessions = [
    {
      id: "s1",
      timestamp: new Date().toISOString(),
      task: "Task 1",
      mode: "plan" as const,
      summary: "- Decided to use JWT"
    },
    {
      id: "s2",
      timestamp: new Date().toISOString(),
      task: "Task 2",
      mode: "plan" as const,
      summary: "- Decided to use JWT"
    }
  ];
  
  const result = buildMemoryFromSessions(mem, sessions);
  // Both sessions have the same note, it should appear only once in decisions
  assert.equal(result.decisions.filter(d => d === "Decided to use JWT").length, 1);
});

test("Reflector - Last Reflected is updated", async () => {
  const mem = createEmptyProjectMemory();
  const sessions = [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Task 1",
    mode: "plan" as const,
    summary: ""
  }];
  
  const result = buildMemoryFromSessions(mem, sessions);
  assert.ok(result.lastReflected);
  const d = new Date(result.lastReflected);
  assert.ok(!isNaN(d.getTime()));
});

test("Reflector LLM - missing providerChat returns clean failure", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const result = await runReflect({ cwd: tmpDir, llm: true });
  assert.ok(!result.ok);
  assert.match(result.summary, /providerChat missing/);
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector LLM - parses valid JSON and updates memory", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const mockProviderChat = async (messages: any[]) => {
    // Redaction check: ensure secrets are stripped before hitting mock
    const hasSecret = JSON.stringify(messages).includes("sk-ant-api");
    assert.ok(!hasSecret, "Secret leaked to provider!");

    return {
      content: JSON.stringify({
        projectSummary: [],
        architectureNotes: [],
        commands: [],
        conventions: [],
        decisions: ["LLM decided to use JWT"],
        recurringIssues: [],
        todo: []
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  };

  const result = await runReflect({ 
    cwd: tmpDir, 
    llm: true, 
    providerChat: mockProviderChat 
  });

  assert.ok(result.ok);
  assert.match(result.summary, /LLM-assisted/);

  const mem = await readProjectMemory(tmpDir);
  assert.ok(mem.decisions.includes("LLM decided to use JWT"));
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector LLM - invalid JSON returns clean failure and fallback deterministic does not run", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const mockProviderChat = async (messages: any[]) => {
    return {
      content: "This is not JSON",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  };

  const result = await runReflect({ 
    cwd: tmpDir, 
    llm: true, 
    providerChat: mockProviderChat 
  });

  assert.ok(!result.ok);
  assert.match(result.summary, /LLM reflection failed/);
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector LLM - redacts secrets before provider input", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Use key sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890-abcdef",
    mode: "code",
    summary: "Created the secret sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890-abcdef"
  }]);
  
  let promptSent = "";
  const mockProviderChat = async (messages: any[]) => {
    promptSent = JSON.stringify(messages);
    return {
      content: JSON.stringify({
        projectSummary: [],
        architectureNotes: [],
        commands: [],
        conventions: [],
        decisions: [],
        recurringIssues: [],
        todo: []
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  };

  const result = await runReflect({ 
    cwd: tmpDir, 
    llm: true, 
    providerChat: mockProviderChat 
  });

  assert.ok(result.ok);
  assert.match(promptSent, /\*\*\*/);
  assert.doesNotMatch(promptSent, /abcdef1234567890/);
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Reflector LLM - dry-run does not write MEMORY.md", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-ref-test-"));
  
  await createTempSession(tmpDir, [{
    id: "s1",
    timestamp: new Date().toISOString(),
    task: "Add auth",
    mode: "plan",
    summary: "- Decided to use JWT"
  }]);
  
  const mockProviderChat = async (messages: any[]) => {
    return {
      content: JSON.stringify({
        projectSummary: [],
        architectureNotes: [],
        commands: [],
        conventions: [],
        decisions: ["LLM decided to use JWT"],
        recurringIssues: [],
        todo: []
      }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    };
  };

  const result = await runReflect({ 
    cwd: tmpDir, 
    llm: true, 
    dryRun: true,
    providerChat: mockProviderChat 
  });

  assert.ok(result.ok);
  assert.ok(result.dryRun);

  const memPath = path.join(tmpDir, ".needle", "MEMORY.md");
  await assert.rejects(fs.stat(memPath)); // Should not exist
  
  await fs.rm(tmpDir, { recursive: true, force: true });
});
