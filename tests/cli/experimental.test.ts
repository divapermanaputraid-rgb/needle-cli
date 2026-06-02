import { describe, it } from "node:test";
import assert from "node:assert";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "../../"); // back to needle-cli root

describe("Experimental Command", () => {
  it("prints a warning message when invoked", async () => {
    try {
      const { stdout, stderr } = await execAsync(`npx tsx src/cli/index.ts experimental`, { cwd: cliRoot });
      
      const combinedOutput = stdout + stderr;
      assert.match(combinedOutput, /Needle experimental runtime is not release-safe yet/i, "Should contain experimental warning");
      assert.match(combinedOutput, /Use this only for testing/i, "Should contain testing warning");
    } catch (e: any) {
      // Even if it exits with error (e.g. TUI failed to load in non-TTY test env), 
      // we just want to ensure the warning was printed before it failed.
      const combinedOutput = (e.stdout || "") + (e.stderr || "");
      assert.match(combinedOutput, /Needle experimental runtime is not release-safe yet/i, "Should contain experimental warning even if command fails");
      assert.match(combinedOutput, /Use this only for testing/i, "Should contain testing warning even if command fails");
    }
  });
});