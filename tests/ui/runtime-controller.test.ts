import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeController } from "../../src/ui/interactive/runtime-controller.js";

test("RuntimeController: basic initialization", () => {
    const rc = new RuntimeController();
    assert.ok(rc);
});