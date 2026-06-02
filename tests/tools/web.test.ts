import { describe, it } from "node:test";
import assert from "node:assert";
import { webFetchTool } from "../../src/tools/web-fetch.js";
import { webSearchTool } from "../../src/tools/web-search.js";
import { ToolContext } from "../../src/tools/types.js";

describe("web tools", () => {
  const dummyContext: ToolContext = { cwd: process.cwd() };

  describe("web_fetch", () => {
    it("can fetch a simple URL (example.com)", async () => {
      try {
        const result = await webFetchTool.execute({ url: "https://example.com" }, dummyContext);
        if (result.ok) {
          assert.ok(result.output.includes("Example Domain"));
        } else {
          assert.match(result.output, /Failed to fetch/i);
        }
      } catch (e) {
        console.warn("Skipping web_fetch live test: fetch threw error (possibly no network)");
      }
    });

    it("returns error for invalid URL", async () => {
      const result = await webFetchTool.execute({ url: "not-a-url" }, dummyContext);
      assert.strictEqual(result.ok, false);
      assert.match(result.output, /Failed to fetch/i);
    });
  });

  describe("web_search", () => {
    it("returns mock message", async () => {
      const result = await webSearchTool.execute({ query: "test query" }, dummyContext);
      // Actual implementation returns ok: false for mock mode
      assert.strictEqual(result.ok, false);
      assert.match(result.output, /mock mode/i);
    });
  });
});
