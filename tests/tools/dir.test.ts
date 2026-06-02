import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { dirCreateTool } from "../../src/tools/dir.create.js";
import { dirExistsTool } from "../../src/tools/dir.exists.js";
import { dirListTool } from "../../src/tools/dir.list.js";

test("Directory Tools Tests", async (t) => {
  const workspaceRoot = path.join(process.cwd(), "needle-cli", "test-workspace");
  const toolContext = { cwd: workspaceRoot };

  // Setup test workspace
  await fs.mkdir(workspaceRoot, { recursive: true });

  t.after(async () => {
    // Cleanup
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  await t.test("dir.create creates inside workspace", async () => {
    const result = await dirCreateTool.execute({ path: "new-dir" }, toolContext);
    assert.equal(result.ok, true);
    
    const exists = await fs.access(path.join(workspaceRoot, "new-dir")).then(() => true).catch(() => false);
    assert.equal(exists, true);
  });

  await t.test("dir.create blocks traversal", async () => {
    const result = await dirCreateTool.execute({ path: "../outside-dir" }, toolContext);
    assert.equal(result.ok, false);
    assert.match(String(result.error), /traversal/i);
  });

  await t.test("dir.create blocks absolute outside path", async () => {
    const result = await dirCreateTool.execute({ path: "/tmp/outside-dir" }, toolContext);
    assert.equal(result.ok, false);
    assert.match(String(result.error), /traversal/i);
  });

  await t.test("dir.exists returns true for existing directory", async () => {
    await fs.mkdir(path.join(workspaceRoot, "existing-dir"), { recursive: true });
    const result = await dirExistsTool.execute({ path: "existing-dir" }, toolContext);
    assert.equal(result.ok, true);
    assert.equal(result.result, true);
  });

  await t.test("dir.exists returns false for non-existing directory", async () => {
    const result = await dirExistsTool.execute({ path: "non-existing-dir" }, toolContext);
    assert.equal(result.ok, true);
    assert.equal(result.result, false);
  });

  await t.test("dir.list lists inside workspace only", async () => {
    await fs.mkdir(path.join(workspaceRoot, "list-dir", "sub"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "list-dir", "file.txt"), "test");
    
    const result = await dirListTool.execute({ path: "list-dir" }, toolContext);
    assert.equal(result.ok, true);
    
    const list = result.result as string[];
    assert.equal(list.length, 2);
    assert.ok(list.some(item => item.includes("sub")));
    assert.ok(list.some(item => item.includes("file.txt")));
  });
  
  await t.test("dir.list blocks traversal", async () => {
      const result = await dirListTool.execute({ path: "../" }, toolContext);
      assert.equal(result.ok, false);
      assert.match(String(result.error), /traversal/i);
  });
});