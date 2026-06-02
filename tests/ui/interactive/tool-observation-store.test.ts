import test from "node:test";
import assert from "node:assert/strict";
import { ToolObservationStore } from "../../../src/ui/interactive/tool-observation-store.js";

test("ToolObservationStore tests", async (t) => {
  let store: ToolObservationStore;

  t.beforeEach(() => {
    store = new ToolObservationStore();
  });

  await t.test("records created directory", () => {
    store.record({ toolName: "dir.create", input: { path: "test-1" }, ok: true, metadata: { path: "test-1", created: true } });
    assert.deepEqual(store.getCreatedDirectories(), ["test-1"]);
    assert.equal(store.getLastCreatedDirectory(), "test-1");
  });

  await t.test("records created file", () => {
    store.record({ toolName: "file.write", input: { path: "test.md" }, ok: true, metadata: { path: "test.md", created: true } });
    assert.deepEqual(store.getCreatedFiles(), ["test.md"]);
    assert.equal(store.getLastCreatedFile(), "test.md");
  });

  await t.test("does not invent missing paths", () => {
    assert.deepEqual(store.getCreatedFiles(), []);
    assert.deepEqual(store.getCreatedDirectories(), []);
    assert.equal(store.getLastCreatedFile(), undefined);
    assert.equal(store.getLastCreatedDirectory(), undefined);
  });

  await t.test("records lastActionSummary", () => {
    store.record({ toolName: "file.write", input: { path: "test.md" }, ok: true, output: "Wrote test.md", metadata: { path: "test.md", created: true } });
    assert.equal(store.getLastActionSummary(), "Wrote test.md");
  });
});