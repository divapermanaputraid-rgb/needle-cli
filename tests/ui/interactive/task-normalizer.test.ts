import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskNormalizer } from '../../../src/ui/interactive/task-normalizer.js';

test('TaskNormalizer - Code Action Routing', async (t) => {
  const normalizer = new TaskNormalizer();

  await t.test('Routes explicit commands to code_action', () => {
    const inputs = [
      "tambahkan slash command /whoami",
      "tambah command /pwd",
      "implement command /status",
      "tambahkan test node:test",
      "jalankan pnpm typecheck dan pnpm test",
      "edit source",
      "bikin file config.json",
      "buat folder src",
      "fix failing test",
      "modify source"
    ];

    for (const input of inputs) {
      const result = normalizer.normalize(input);
      assert.equal(
        result.intent, 
        'code_action', 
        `Expected '${input}' to route to code_action, got ${result.intent}`
      );
    }
  });

  await t.test('Routes simple folder, file, and follow-up actions with high confidence', () => {
    const inputs = [
      "buat folder test-1",
      "buat file test.md isinya hello",
      "mana filenya?",
    ];

    for (const input of inputs) {
      const result = normalizer.normalize(input);
      assert.ok(result.confidence >= 0.9, `Expected '${input}' to bypass the classifier`);
    }
  });

  await t.test('Keeps broad code actions below deterministic threshold', () => {
    const result = normalizer.normalize("tambahkan slash command /whoami");
    assert.equal(result.intent, "code_action");
    assert.ok(result.confidence < 0.9);
  });

  await t.test('Routes plan to plan intent', () => {
    const inputs = [
      "bikin plan",
      "buat plan fitur auth",
      "plan fitur login"
    ];

    for (const input of inputs) {
      const result = normalizer.normalize(input);
      assert.equal(
        result.intent, 
        'plan', 
        `Expected '${input}' to route to plan, got ${result.intent}`
      );
    }
  });

  await t.test('Routes general chatter to chat intent', () => {
    const inputs = [
      "jelaskan project ini",
      "gimana cara kerja nya?",
      "halo"
    ];

    for (const input of inputs) {
      const result = normalizer.normalize(input);
      assert.equal(
        result.intent, 
        'chat', 
        `Expected '${input}' to route to chat, got ${result.intent}`
      );
    }
  });

  await t.test('Keeps generic ambiguous chatter below deterministic threshold', () => {
    const result = normalizer.normalize("coba rapihin flow routing");
    assert.equal(result.intent, "chat");
    assert.ok(result.confidence < 0.9);
  });
});
