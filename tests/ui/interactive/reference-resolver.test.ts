import test from "node:test";
import assert from "node:assert/strict";
import { ReferenceResolver } from "../../../src/ui/interactive/reference-resolver.js";
import { ToolObservationStore } from "../../../src/ui/interactive/tool-observation-store.js";

test("ReferenceResolver tests", async (t) => {
  let store: ToolObservationStore;
  let resolver: ReferenceResolver;

  t.beforeEach(() => {
    store = new ToolObservationStore();
    resolver = new ReferenceResolver(store);
  });

  await t.test("after lastCreatedDirectory = test-1, 'di dalamnya' resolves to test-1", () => {
    store.record({ toolName: "dir.create", input: { path: "test-1" }, ok: true, metadata: { path: "test-1", created: true } });
    const res = resolver.resolveTargetDirectory("isi di dalamnya");
    assert.equal(res, "test-1");
  });

  await t.test("after lastCreatedDirectory = test-1, 'folder tadi' resolves to test-1", () => {
    store.record({ toolName: "dir.create", input: { path: "test-1" }, ok: true, metadata: { path: "test-1", created: true } });
    const res = resolver.resolveTargetDirectory("isi di folder tadi");
    assert.equal(res, "test-1");
  });

  await t.test("after lastCreatedFile = test.md, 'file tadi' resolves to test.md", () => {
    store.record({ toolName: "file.write", input: { path: "test.md" }, ok: true, metadata: { path: "test.md", created: true } });
    const res = resolver.resolveTargetFile("ubah file tadi");
    assert.equal(res, "test.md");
  });

  await t.test("no prior target returns undefined", () => {
    const resDir = resolver.resolveTargetDirectory("di dalamnya");
    assert.equal(resDir, undefined);
    
    const resFile = resolver.resolveTargetFile("file tadi");
    assert.equal(resFile, undefined);
  });
});