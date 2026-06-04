import test from "node:test";
import assert from "node:assert/strict";
import {
  LLMRouteClassifier,
  parseLLMRouteClassification,
} from "../../src/ui/interactive/llm-route-classifier.js";
import { TaskNormalizer } from "../../src/ui/interactive/task-normalizer.js";

const validResult = {
  intent: "code_action",
  confidence: 0.91,
  reason: "The request asks for a workspace change.",
  task: "Add the command.",
  requiresConfirmation: true,
};

test("LLMRouteClassifier", async (t) => {
  await t.test("parses strict raw and fenced JSON", () => {
    assert.equal(parseLLMRouteClassification(JSON.stringify(validResult)).intent, "code_action");
    assert.equal(
      parseLLMRouteClassification(`\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``).intent,
      "code_action",
    );
  });

  await t.test("rejects malformed and extra-field responses", () => {
    assert.throws(() => parseLLMRouteClassification("not json"));
    assert.throws(() => parseLLMRouteClassification(JSON.stringify({ ...validResult, extra: true })));
  });

  await t.test("rejects tool-call-shaped responses without executing tools", async () => {
    let toolExecutions = 0;
    const classifier = new LLMRouteClassifier();

    await assert.rejects(() => classifier.classify({
      input: "tambahkan command",
      candidate: new TaskNormalizer().normalize("tambahkan command"),
      profile: "router",
      providerChat: async request => {
        assert.equal("tools" in request, false);
        return {
          content: JSON.stringify({
            ...validResult,
            tool_calls: [{ name: "file.write" }],
          }),
          model: "router-model",
          provider: "openrouter",
        };
      },
    }));
    assert.equal(toolExecutions, 0);
  });

  await t.test("passes the selected profile and classification-only messages", async () => {
    const classifier = new LLMRouteClassifier();
    const result = await classifier.classify({
      input: "tambahkan command",
      candidate: new TaskNormalizer().normalize("tambahkan command"),
      profile: "fast",
      providerChat: async request => {
        assert.equal(request.profile, "fast");
        assert.equal(request.temperature, 0);
        assert.equal(request.messages.length, 2);
        return {
          content: JSON.stringify(validResult),
          model: "fast-model",
          provider: "openrouter",
        };
      },
    });

    assert.equal(result.intent, "code_action");
  });
});
