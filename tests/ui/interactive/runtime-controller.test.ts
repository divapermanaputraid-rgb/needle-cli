import test from "node:test";
import assert from "node:assert/strict";
import { TaskNormalizer } from "../../../src/ui/interactive/task-normalizer.js";

test("RuntimeController routing candidates", async (t) => {
  const normalizer = new TaskNormalizer();

  await t.test("routes deterministic folder actions", () => {
    const result = normalizer.normalize("buatkan folder test-1");
    assert.equal(result.intent, "code_action");
    assert.equal(result.targetDirectory, "test-1");
  });

  await t.test("routes follow-up lookups", () => {
    assert.equal(normalizer.normalize("mana foldernya?").intent, "followup_lookup");
  });

  await t.test("keeps broad code actions as classifier candidates", () => {
    const inputs = [
      "tambahkan slash command /whoami",
      "tambah command /pwd",
      "implement command /status",
      "jalankan pnpm test",
    ];
    for (const input of inputs) {
      const result = normalizer.normalize(input);
      assert.equal(result.intent, "code_action");
      assert.ok(result.confidence < 0.9);
    }
  });

  await t.test("routes clear chat and plan input", () => {
    assert.equal(normalizer.normalize("jelaskan workspace ini").intent, "chat");
    assert.equal(normalizer.normalize("halo").intent, "chat");
    assert.equal(normalizer.normalize("bikin plan fitur login").intent, "plan");
  });
});
