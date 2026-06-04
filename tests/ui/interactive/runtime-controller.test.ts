import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeController } from "../../../src/ui/interactive/runtime-controller.js";
import { TaskNormalizer } from "../../../src/ui/interactive/task-normalizer.js";
import { SessionState } from "../../../src/ui/interactive/session-state.js";
import type { CodeActionRunnerOptions } from "../../../src/ui/interactive/code-action-runner.js";
import type { AgentLoopResult } from "../../../src/core/agent-loop.js";

// Mock implementation to avoid running real LLM
const mockRunCodeAction = async (options: CodeActionRunnerOptions): Promise<AgentLoopResult | undefined> => {
  if (options.input.includes("fail")) {
    return { ok: false, summary: "Failed", iterations: 1, toolCalls: [] };
  }
  return {
    ok: true,
    summary: "Success",
    iterations: 1,
    toolCalls: [{ tool: "dir.create", ok: true }],
    observations: [
      {
        toolName: "dir.create",
        ok: true,
        input: { path: "test-1" },
        output: "Created directory test-1",
        metadata: { path: "test-1", created: true },
        timestamp: Date.now()
      }
    ]
  };
};

test("RuntimeController", async (t) => {
  await t.test("routes 'buatkan folder test-1' to code_action", async () => {
    let handledAsCode = false;
    let fallbackToChat = false;

    // We can inject a mock runner when initializing the controller
    // But since it imports it directly, we just verify the router behavior first
    const router = new TaskNormalizer();
    const result = router.normalize("buatkan folder test-1");
    assert.equal(result.intent, "code_action");
    assert.equal(result.targetDirectory, "test-1");
  });

  await t.test("routes 'mana foldernya?' to followup_lookup", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("mana foldernya?");
    assert.equal(result.intent, "followup_lookup");
  });
  
  await t.test("routes 'tambahkan slash command /whoami' to code_action", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("tambahkan slash command /whoami");
    assert.equal(result.intent, "code_action");
  });

  await t.test("routes 'tambah command /pwd' to code_action", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("tambah command /pwd");
    assert.equal(result.intent, "code_action");
  });
  
  await t.test("routes 'implement command /status' to code_action", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("implement command /status");
    assert.equal(result.intent, "code_action");
  });
  
  await t.test("routes 'jalankan pnpm test' to code_action", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("jalankan pnpm test");
    assert.equal(result.intent, "code_action");
  });
  
  await t.test("routes 'jelaskan workspace ini' to chat", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("jelaskan workspace ini");
    assert.equal(result.intent, "chat");
  });
  
  await t.test("routes 'halo' to chat", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("halo");
    assert.equal(result.intent, "chat");
  });
  
  await t.test("routes 'bikin plan fitur login' to plan", async () => {
    const router = new TaskNormalizer();
    const result = router.normalize("bikin plan fitur login");
    assert.equal(result.intent, "plan");
  });
});
