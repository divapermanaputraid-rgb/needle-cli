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
  it("prints graceful error if src-v2 is missing in production", async () => {
    // We simulate the production state by moving src-v2 temporarily
    const fs = await import("node:fs");
    const srcV2Path = path.resolve(cliRoot, "src-v2");
    const tempPath = path.resolve(cliRoot, "src-v2-hidden-test");
    
    let renamed = false;
    try {
      if (fs.existsSync(srcV2Path)) {
        fs.renameSync(srcV2Path, tempPath);
        renamed = true;
      }
      
      const { stdout, stderr } = await execAsync(`npx tsx src/cli/index.ts experimental`, { cwd: cliRoot });
      // Should not reach here if exit(1) is called correctly
      assert.fail("Command should have exited with error");
    } catch (e: any) {
      const combinedOutput = (e.stdout || "") + (e.stderr || "");
      assert.match(combinedOutput, /Experimental runtime is not included in this package build/i, "Should contain missing package warning");
      assert.strictEqual(e.code, 1, "Should exit with code 1");
    } finally {
      if (renamed && fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, srcV2Path);
      }
    }
  });

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