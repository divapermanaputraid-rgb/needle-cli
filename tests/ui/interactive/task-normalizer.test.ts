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
});