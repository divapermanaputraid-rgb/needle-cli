import test from "node:test";
import assert from "node:assert/strict";
import { ToolObservationStore } from "../../src/ui/interactive/tool-observation-store.js";

test("ToolObservationStore: keeps relative display path", () => {
    const store = new ToolObservationStore();
    
    store.updateLastCreatedDirectory("test-1", "/tmp/mock/test-1");
    const dirs = store.getCreatedDirectories();
    
    assert.equal(dirs.length, 1);
    assert.equal(dirs[0], "test-1");
    
    const lastDir = store.getLastCreatedDirectory();
    assert.equal(lastDir, "test-1");
});

test("ToolObservationStore: file.write keeps relative path", () => {
    const store = new ToolObservationStore();
    
    store.updateLastCreatedFile("test-1/README.md", "/tmp/mock/test-1/README.md");
    const files = store.getCreatedFiles();
    
    assert.equal(files.length, 1);
    assert.equal(files[0], "test-1/README.md");
    
    const lastFile = store.getLastCreatedFile();
    assert.equal(lastFile, "test-1/README.md");
});