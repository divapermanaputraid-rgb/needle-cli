import test from "node:test";
import assert from "node:assert/strict";
import { ToolRegistry, createDefaultToolRegistry } from "../../src/tools/registry.js";
import { ToolDefinition, ToolResult } from "../../src/tools/types.js";

test("Tool Registry Tests", async (t) => {
  const registry = createDefaultToolRegistry();

  await t.test("all core tools have metadata", () => {
    const tools = registry.list();
    assert.ok(tools.length > 0);
    for (const tool of tools) {
      assert.ok(tool.name, `Missing name on ${tool.name}`);
      assert.ok(tool.description, `Missing description on ${tool.name}`);
      assert.ok(tool.inputSchema || tool.inputSchemaDescription, `Missing schema on ${tool.name}`);
      assert.ok(tool.riskLevel, `Missing riskLevel on ${tool.name}`);
    }
  });

  await t.test("registry rejects unknown tool", async () => {
    await assert.rejects(
      async () => {
        await registry.execute("unknown-tool", {}, { cwd: process.cwd() });
      },
      /Unknown tool: unknown-tool/
    );
  });

  await t.test("registry blocks missing riskLevel", () => {
    const customRegistry = new ToolRegistry();
    const badTool: any = {
      name: "bad-tool",
      description: "bad",
      inputSchemaDescription: "bad",
      execute: async () => ({ ok: true, tool: "bad-tool" })
    };
    
    assert.throws(
      () => {
        customRegistry.register(badTool);
      },
      /Tool missing riskLevel: bad-tool/
    );
  });
  
  await t.test("registry blocks missing schema", () => {
    const customRegistry = new ToolRegistry();
    const badTool: any = {
      name: "bad-tool",
      description: "bad",
      riskLevel: "low",
      execute: async () => ({ ok: true, tool: "bad-tool" })
    };
    
    assert.throws(
      () => {
        customRegistry.register(badTool);
      },
      /Tool missing input schema: bad-tool/
    );
  });
});