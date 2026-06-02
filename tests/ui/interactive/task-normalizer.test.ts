import test from "node:test";
import assert from "node:assert/strict";
import { TaskNormalizer } from "../../../src/ui/interactive/task-normalizer.js";

test("TaskNormalizer tests", async (t) => {
  const normalizer = new TaskNormalizer();

  await t.test("routes 'jelasin project ini' to chat", () => {
    const res = normalizer.normalize("jelasin project ini");
    assert.equal(res.intent, "chat");
  });

  await t.test("routes 'bikin plan fitur login' to plan", () => {
    const res = normalizer.normalize("bikin plan fitur login");
    assert.equal(res.intent, "plan");
  });

  await t.test("routes 'buat folder test-1' to code_action with targetDirectory test-1", () => {
    const res = normalizer.normalize("buat folder test-1");
    assert.equal(res.intent, "code_action");
    assert.equal(res.targetDirectory, "test-1");
  });

  await t.test("routes 'buat file test.md isinya hello needle' to code_action with targetPath and contentGoal", () => {
    const res = normalizer.normalize("buat file test.md isinya hello needle");
    assert.equal(res.intent, "code_action");
    assert.equal(res.targetPath, "test.md");
    assert.ok(res.contentGoal && res.contentGoal.includes("hello needle"));
  });

  await t.test("routes 'isi di dalamnya dengan docs lengkap' to write_documentation", () => {
    const res = normalizer.normalize("isi di dalamnya dengan docs lengkap");
    assert.equal(res.intent, "write_documentation");
  });

  await t.test("routes 'mana filenya?' to followup_lookup", () => {
    const res = normalizer.normalize("mana filenya?");
    assert.equal(res.intent, "followup_lookup");
  });

  await t.test("does not create silly filenames from question words", () => {
    const res = normalizer.normalize("mana di dalam nya buat file .md");
    // "mana" should not be the filename
    assert.notEqual(res.targetPath?.toLowerCase(), "mana.md");
    assert.notEqual(res.targetPath?.toLowerCase(), "apa.md");
  });
});