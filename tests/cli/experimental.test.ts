import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "../../");
const commandSource = path.join(cliRoot, "src/cli/commands/experimental.ts");

describe("Experimental Command", () => {
  it("always reports that the runtime is not included in the stable build", () => {
    const result = spawnSync(
      "pnpm",
      ["exec", "tsx", "src/cli/index.ts", "experimental"],
      { cwd: cliRoot, encoding: "utf8" },
    );
    const combinedOutput = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1);
    assert.match(combinedOutput, /Needle experimental runtime is not release-safe yet/i);
    assert.match(combinedOutput, /Use this only for testing/i);
    assert.match(combinedOutput, /Experimental runtime is not included in this package build/i);
  });

  it("contains no bundler-visible experimental runtime import", async () => {
    const source = await readFile(commandSource, "utf8");

    assert.doesNotMatch(source, /src-v2/i);
    assert.doesNotMatch(source, /run-tui/i);
    assert.doesNotMatch(source, /import\s*\(/);
  });
});
