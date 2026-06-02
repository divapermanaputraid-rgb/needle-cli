import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { detectRepoConventions } from "../../../src/runtime/repo/repo-conventions.js";

test("detects pnpm from packageManager field", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "needle-repo-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      packageManager: "pnpm@9.0.0",
      scripts: {
        test: "node --test",
        typecheck: "tsc --noEmit",
        build: "tsup"
      }
    }));
    fs.mkdirSync(path.join(tmp, "tests"));
    fs.writeFileSync(path.join(tmp, "tests", "dummy.test.ts"), `import test from "node:test";\nimport assert from "node:assert/strict";`);

    const result = detectRepoConventions(tmp);
    
    assert.equal(result.packageManager, "pnpm");
    assert.equal(result.testCommand, "pnpm test");
    assert.equal(result.typecheckCommand, "pnpm typecheck");
    assert.equal(result.buildCommand, "pnpm build");
    assert.equal(result.testFramework, "node:test");
    assert.equal(result.assertionLibrary, "node:assert/strict");
    
    assert.ok(result.conventionsSummary.includes("Package manager: pnpm"));
    assert.ok(result.conventionsSummary.includes("Test framework: node:test"));
    assert.ok(result.conventionsSummary.includes("Assertion library: node:assert/strict"));
    assert.ok(result.conventionsSummary.includes("Do not use vitest"));
    assert.ok(result.conventionsSummary.includes("Do not use bun:test"));
    assert.ok(result.conventionsSummary.includes("Typecheck: pnpm typecheck"));
    assert.ok(result.conventionsSummary.includes("Test: pnpm test"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("detects lock files if packageManager field is missing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "needle-repo-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      scripts: {
        test: "vitest run"
      }
    }));
    fs.writeFileSync(path.join(tmp, "yarn.lock"), "");
    fs.mkdirSync(path.join(tmp, "tests"));
    fs.writeFileSync(path.join(tmp, "tests", "dummy.test.ts"), `import { test, expect } from "vitest";`);

    const result = detectRepoConventions(tmp);
    
    assert.equal(result.packageManager, "yarn");
    assert.equal(result.testCommand, "yarn test");
    assert.equal(result.typecheckCommand, undefined);
    assert.equal(result.testFramework, "vitest");
    assert.equal(result.assertionLibrary, "expect");
    
    assert.ok(!result.conventionsSummary.includes("Do not use vitest"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("detects node:test from existing tests when not specified in scripts", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "needle-repo-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      scripts: {}
    }));
    fs.writeFileSync(path.join(tmp, "package-lock.json"), "");
    fs.mkdirSync(path.join(tmp, "tests"));
    fs.writeFileSync(path.join(tmp, "tests", "dummy.test.ts"), `import test from 'node:test';\nimport assert from 'node:assert/strict';`);

    const result = detectRepoConventions(tmp);
    
    assert.equal(result.packageManager, "npm");
    assert.equal(result.testFramework, "node:test");
    assert.equal(result.assertionLibrary, "node:assert/strict");
    
    assert.ok(result.conventionsSummary.includes("Do not use vitest"));
    assert.ok(result.conventionsSummary.includes("Do not use bun:test"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});