import { describe, it } from "node:test";
import assert from "node:assert";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { fileEditTool } from "../../src/tools/file-edit.js";
import { ToolContext } from "../../src/tools/types.js";

describe("file.edit tool", () => {
  const dummyContext: ToolContext = { cwd: process.cwd() };

  it("can edit a safe temp file", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-test-"));
    const filePath = path.join(tmpDir, "safe-temp.txt");

    await fs.writeFile(filePath, "hello world", "utf-8");

    const result = await fileEditTool.execute(
      { path: filePath, search: "world", replace: "universe" },
      dummyContext
    );

    assert.strictEqual(result.ok, true);

    const content = await fs.readFile(filePath, "utf-8");
    assert.strictEqual(content, "hello universe");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("blocks editing .env", async () => {
    const validation = fileEditTool.validate?.(
      { path: ".env", search: "FOO", replace: "BAR" },
      dummyContext
    );
    assert.ok(validation);
    assert.match(validation.output, /protected/i);
  });
});