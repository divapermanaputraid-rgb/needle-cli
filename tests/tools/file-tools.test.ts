import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { fileWriteTool } from "../../src/tools/file-write.js";
import { fileReadTool } from "../../src/tools/file-read.js";

test("File Tools Tests", async (t) => {
  const workspaceRoot = path.join(process.cwd(), "needle-cli", "test-workspace-file");
  const toolContext = { cwd: workspaceRoot };

  // Setup test workspace
  await fs.mkdir(workspaceRoot, { recursive: true });

  t.after(async () => {
    // Cleanup
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  await t.test("file.write writes inside workspace", async () => {
    const result = await fileWriteTool.execute({ path: "test.txt", content: "hello" }, toolContext);
    assert.equal(result.ok, true);
    
    const content = await fs.readFile(path.join(workspaceRoot, "test.txt"), "utf8");
    assert.equal(content, "hello");
  });

  await t.test("file.write blocks outside workspace", async () => {
    const result = await fileWriteTool.execute({ path: "../outside.txt", content: "hello" }, toolContext);
    assert.equal(result.ok, false);
    assert.match(String(result.error), /traversal/i);
  });

  await t.test("file.write blocks .env", async () => {
    const result = await fileWriteTool.execute({ path: ".env", content: "hello" }, toolContext);
    assert.equal(result.ok, false);
    assert.match(String(result.error), /sensitive file/i);
  });

  await t.test("file.read handles missing file cleanly", async () => {
    const result = await fileReadTool.execute({ path: "missing.txt" }, toolContext);
    assert.equal(result.ok, false);
    assert.match(String(result.error), /not found/i);
  });

  await t.test("file.read returns structured error", async () => {
    const result = await fileReadTool.execute({ path: "missing2.txt" }, toolContext);
    assert.equal(result.ok, false);
    assert.equal(result.tool, "file.read");
    assert.ok(result.error);
  });
  
  await t.test("file.read reads inside workspace", async () => {
      await fs.writeFile(path.join(workspaceRoot, "read-test.txt"), "read-content");
      const result = await fileReadTool.execute({ path: "read-test.txt" }, toolContext);
      assert.equal(result.ok, true);
      assert.equal(result.result, "read-content");
  });
});