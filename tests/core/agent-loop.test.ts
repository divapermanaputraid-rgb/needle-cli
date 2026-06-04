import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runAgentLoop } from "../../src/core/agent-loop.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import type { ChatMessage, ChatResponse } from "../../src/providers/types.js";

async function createValidationFixture(scripts: Record<string, string>): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-validation-"));
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "needle-validation-fixture", scripts }, null, 2),
  );
  return tmpDir;
}

function createWriteRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register({
    name: "file.write",
    description: "writes a fixture file",
    riskLevel: "medium",
    isReadOnly: false,
    inputSchemaDescription: "{}",
    execute: async (_input, context) => {
      await fs.writeFile(path.join(context.cwd, "result.txt"), "ok\n");
      return {
        ok: true,
        output: "written",
        metadata: { path: "result.txt" },
      };
    },
  });
  return registry;
}

function createWriteThenFinalProvider(): (messages: ChatMessage[]) => Promise<ChatResponse> {
  let callCount = 0;
  return async () => {
    callCount++;
    return {
      content: callCount === 1
        ? JSON.stringify({ type: "tool_call", tool: "file.write", input: {} })
        : JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "test-provider",
    };
  };
}

test("agent loop stops on final response and logs session", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-test-"));
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test-model",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: tmpDir,
    task: "do something",
    providerChat,
    maxIterations: 2
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterations, 1);
  assert.equal(result.summary, "Done");

  const sessionsRaw = await fs.readFile(path.join(tmpDir, ".needle", "sessions", "runs.jsonl"), "utf-8");
  const sessions = sessionsRaw.trim().split("\n").map(l => JSON.parse(l));
  
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].mode, "code");
  assert.equal(sessions[0].task, "do something");
  assert.equal(sessions[0].status, "success");
  assert.equal(sessions[0].summary, "Done");
});

test("agent loop executes safe read-only tool", async () => {
  const registry = new ToolRegistry();
  let executed = false;
  
  registry.register({
    name: "safe-read",
    description: "reads",
    riskLevel: "low",
    isReadOnly: true,
    inputSchemaDescription: "{}",
    execute: async () => {
      executed = true;
      return { ok: true, output: "read OK" };
    }
  });

  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: JSON.stringify({ type: "tool_call", tool: "safe-read", input: {} }),
        model: "test",
        provider: "nine-router"
      };
    }
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: registry
  });

  assert.equal(result.ok, true);
  assert.equal(executed, true);
  assert.equal(result.toolCalls.length, 1);
  assert.equal(result.toolCalls[0].tool, "safe-read");
  assert.equal(result.toolCalls[0].ok, true);
  assert.deepEqual(result.validationResults, []);
});

test("agent loop handles unknown tool", async () => {
  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: JSON.stringify({ type: "tool_call", tool: "unknown-tool", input: {} }),
        model: "test",
        provider: "nine-router"
      };
    }
    
    // assert the error message was fed back
    const lastMsg = messages[messages.length - 1];
    assert.match(lastMsg.content, /Unknown tool/);
    
    return {
      content: JSON.stringify({ type: "final", summary: "Done after error" }),
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, true);
  assert.equal(result.toolCalls.length, 1);
  assert.equal(result.toolCalls[0].tool, "unknown-tool");
  assert.equal(result.toolCalls[0].ok, false);
});

test("agent loop rejects pseudo tool text and issues retry", async () => {
  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: "I will use /code file.ts to read the file.",
        model: "test",
        provider: "test-provider"
      };
    }
    
    const lastMsg = messages[messages.length - 1];
    assert.match(lastMsg.content, /pseudo tool text/);
    
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "test-provider"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterations, 2);
});

test("agent loop rejects final answer that claims success without verification", async () => {
  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: JSON.stringify({ type: "final", summary: "I successfully created the file" }),
        model: "test",
        provider: "test-provider"
      };
    }
    
    const lastMsg = messages[messages.length - 1];
    assert.match(lastMsg.content, /Your summary claims changes.*no successful tool calls/);
    
    return {
      content: JSON.stringify({ type: "final", summary: "I failed to create the file" }),
      model: "test",
      provider: "test-provider"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterations, 2);
  assert.equal(result.summary, "I failed to create the file");
});

test("agent loop handles invalid JSON and continues", async () => {
  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: "not json",
        model: "test",
        provider: "nine-router"
      };
    }
    
    const lastMsg = messages[messages.length - 1];
    assert.match(lastMsg.content, /Invalid JSON response/);
    
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterations, 2);
});

test("agent loop stops at max iterations and reports honest failure when no tools executed", async () => {
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    return {
      content: "not json",
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    maxIterations: 2,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, false);
  assert.equal(result.iterations, 2);
  assert.match(result.summary, /The coding agent did not execute any tools/);
});

test("agent loop handles ok:false tool result", async () => {
  const registry = new ToolRegistry();
  
  registry.register({
    name: "fail-tool",
    description: "fails",
    riskLevel: "low",
    isReadOnly: true,
    inputSchemaDescription: "{}",
    execute: async () => {
      return { ok: false, output: "Error xyz" };
    }
  });

  let callCount = 0;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    callCount++;
    if (callCount === 1) {
      return {
        content: JSON.stringify({ type: "tool_call", tool: "fail-tool", input: {} }),
        model: "test",
        provider: "nine-router"
      };
    }
    
    const lastMsg = messages[messages.length - 1];
    assert.match(lastMsg.content, /Tool failed: Error xyz/);
    
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    toolRegistry: registry
  });

  assert.equal(result.ok, true);
  assert.equal(result.toolCalls[0].ok, false);
});

test("dryRun builds context and skips provider execution", async () => {
  let called = false;
  const providerChat = async (messages: ChatMessage[]): Promise<ChatResponse> => {
    called = true;
    return {
      content: JSON.stringify({ type: "final", summary: "Done" }),
      model: "test",
      provider: "nine-router"
    };
  };

  const result = await runAgentLoop({
    cwd: process.cwd(),
    task: "test",
    providerChat,
    dryRun: true,
    toolRegistry: new ToolRegistry()
  });

  assert.equal(result.ok, true);
  assert.equal(called, false, "Provider should not be called in dry run mode");
  assert.equal(result.iterations, 0);
  assert.match(result.summary, /Dry run completed/);
  assert.deepEqual(result.validationResults, []);
});

test("agent loop records successful validation commands", async (t) => {
  const cwd = await createValidationFixture({
    typecheck: 'node -e "process.exit(0)"',
    test: 'node -e "process.exit(0)"',
  });
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));

  const result = await runAgentLoop({
    cwd,
    task: "write a file",
    providerChat: createWriteThenFinalProvider(),
    toolRegistry: createWriteRegistry(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.validationResults, [
    { command: "npm run typecheck", ok: true, exitCode: 0 },
    { command: "npm run test", ok: true, exitCode: 0 },
  ]);
});

test("agent loop records failed validation without claiming success", async (t) => {
  const cwd = await createValidationFixture({
    typecheck: 'node -e "process.exit(0)"',
    test: 'node -e "process.exit(7)"',
  });
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));

  const result = await runAgentLoop({
    cwd,
    task: "write a file",
    providerChat: createWriteThenFinalProvider(),
    toolRegistry: createWriteRegistry(),
    maxIterations: 3,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.validationResults, [
    { command: "npm run typecheck", ok: true, exitCode: 0 },
    { command: "npm run test", ok: false, exitCode: 7 },
  ]);
  assert.doesNotMatch(result.summary, /passed|success/i);
});

test("agent loop keeps only the latest validation attempt after retry", async (t) => {
  const cwd = await createValidationFixture({
    typecheck: 'node -e "process.exit(0)"',
    test: `node -e "const fs=require('fs'); if (fs.existsSync('.validation-ready')) process.exit(0); fs.writeFileSync('.validation-ready','1'); process.exit(5)"`,
  });
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));

  const result = await runAgentLoop({
    cwd,
    task: "write a file",
    providerChat: createWriteThenFinalProvider(),
    toolRegistry: createWriteRegistry(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.validationResults, [
    { command: "npm run typecheck", ok: true, exitCode: 0 },
    { command: "npm run test", ok: true, exitCode: 0 },
  ]);
});
