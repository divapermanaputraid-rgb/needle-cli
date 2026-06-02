import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeController } from "../../../src/ui/interactive/runtime-controller.js";
import { IntentRouter } from "../../../src/ui/interactive/intent-router.js";
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
    const router = new IntentRouter();
    const result = router.route("buatkan folder test-1");
    assert.equal(result.intent, "code_action");
    assert.equal(result.targetDirectory, "test-1");
  });

  await t.test("routes 'mana foldernya?' to followup_lookup", async () => {
    const router = new IntentRouter();
    const result = router.route("mana foldernya?");
    assert.equal(result.intent, "followup_lookup");
  });
});