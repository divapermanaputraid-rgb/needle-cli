import { describe, it } from "node:test";
import assert from "node:assert";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { fileWriteTool } from "../../src/tools/file-write.js";
import { ToolContext } from "../../src/tools/types.js";

describe("file.write tool", () => {
  const dummyContext: ToolContext = { cwd: process.cwd() };

  it("can write a safe temp file", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-test-"));
    const filePath = path.join(tmpDir, "safe-temp.txt");

    const result = await fileWriteTool.execute(
      { path: filePath, content: "hello world" },
      dummyContext
    );

    assert.strictEqual(result.ok, true);

    const content = await fs.readFile(filePath, "utf-8");
    assert.strictEqual(content, "hello world");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("blocks writing to .env", async () => {
    const validation = fileWriteTool.validate?.({ path: ".env", content: "secret" }, dummyContext);
    assert.ok(validation);
    assert.match(validation.output, /protected/i);
  });

  it("blocks writing outside workspace", async () => {
    const validation = fileWriteTool.validate?.({ path: "../outside.txt", content: "data" }, dummyContext);
    assert.ok(validation);
    assert.match(validation.output, /traversal/i);
  });
});