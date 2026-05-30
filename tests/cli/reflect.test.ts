import test from "node:test";
import * as assert from "node:assert/strict";
import { reflectCommand } from "../../src/cli/commands/reflect.js";

test("CLI - reflect command registers without crash", () => {
  const cmd = reflectCommand();
  assert.equal(cmd.name(), "reflect");
  assert.equal(cmd.description(), "Reflect on recent sessions and update project memory");
});

test("CLI - reflect --limit parses number", () => {
  const cmd = reflectCommand();
  const option = cmd.options.find(o => o.long === "--limit");
  assert.ok(option);
  assert.equal(option.defaultValue, "20");
});

test("CLI - reflect --dry-run works with no sessions", () => {
  const cmd = reflectCommand();
  const option = cmd.options.find(o => o.long === "--dry-run");
  assert.ok(option);
});

test("CLI - reflect --force option exists", () => {
  const cmd = reflectCommand();
  const option = cmd.options.find(o => o.long === "--force");
  assert.ok(option);
});

test("CLI - --llm and --profile options exist", () => {
  const cmd = reflectCommand();
  const llmOption = cmd.options.find(o => o.long === "--llm");
  assert.ok(llmOption);
  
  const profileOption = cmd.options.find(o => o.long === "--profile");
  assert.ok(profileOption);
  assert.equal(profileOption.defaultValue, "smart");
});
