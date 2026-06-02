import { describe, it } from "node:test";
import assert from "node:assert";
import { resolveCliEntrypoint, program } from "../../src/cli/index.js";

describe("CLI Entrypoint", () => {
  it("routes to interactive shell when no args are provided", () => {
    // e.g. ["node", "dist/index.js"]
    const args = ["node", "dist/index.js"];
    const route = resolveCliEntrypoint(args);
    assert.strictEqual(route, "interactive");
  });

  it("routes to commander when args are provided", () => {
    // e.g. ["node", "dist/index.js", "experimental"]
    const args = ["node", "dist/index.js", "experimental"];
    const route = resolveCliEntrypoint(args);
    assert.strictEqual(route, "commander");
  });

  it("registers expected existing commands", () => {
    const cmds = program.commands.map(c => c.name());
    
    assert.ok(cmds.includes("doctor"), "doctor command should be registered");
    assert.ok(cmds.includes("plan"), "plan command should be registered");
    assert.ok(cmds.includes("models"), "models command should be registered");
    assert.ok(cmds.includes("sessions"), "sessions command should be registered");
    assert.ok(cmds.includes("reflect"), "reflect command should be registered");
    assert.ok(cmds.includes("experimental"), "experimental command should be registered");
  });
});