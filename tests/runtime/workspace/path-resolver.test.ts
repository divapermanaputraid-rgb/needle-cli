import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveWorkspacePath } from "../../../src/runtime/workspace/path-resolver.js";

test("Path Resolver Tests", async (t) => {
  const workspaceRoot = "/Users/test/workspace";

  await t.test("allows workspace relative file", () => {
    const result = resolveWorkspacePath(workspaceRoot, "src/index.ts");
    assert.equal(result.ok, true);
    assert.equal(result.normalizedPath, path.normalize("/Users/test/workspace/src/index.ts"));
  });

  await t.test("allows nested workspace path", () => {
    const result = resolveWorkspacePath(workspaceRoot, "src/utils/helpers.ts");
    assert.equal(result.ok, true);
  });

  await t.test("blocks ../outside", () => {
    const result = resolveWorkspacePath(workspaceRoot, "../outside/file.txt");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "Path traversal outside workspace root is blocked.");
  });

  await t.test("blocks absolute path outside workspace", () => {
    const result = resolveWorkspacePath(workspaceRoot, "/etc/passwd");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "Absolute paths outside workspace root are blocked.");
  });

  await t.test("blocks .env write target", () => {
    const result = resolveWorkspacePath(workspaceRoot, ".env", { isWrite: true });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "Cannot write to sensitive file: .env");
  });

  await t.test("allows .env read target", () => {
    const result = resolveWorkspacePath(workspaceRoot, ".env", { isWrite: false });
    assert.equal(result.ok, true);
  });

  await t.test("blocks .git/config write target", () => {
    const result = resolveWorkspacePath(workspaceRoot, ".git/config", { isWrite: true });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "Cannot write to sensitive directory: .git");
  });

  await t.test("blocks private key write target", () => {
    const result = resolveWorkspacePath(workspaceRoot, "id_rsa", { isWrite: true });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "Cannot write to sensitive file: id_rsa");
  });

  await t.test("normalizes safe path", () => {
    const result = resolveWorkspacePath(workspaceRoot, "src/../src/index.ts");
    assert.equal(result.ok, true);
    assert.equal(result.normalizedPath, path.normalize("/Users/test/workspace/src/index.ts"));
  });
});