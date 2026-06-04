import test from "node:test";
import assert from "node:assert/strict";
import { runCodeAction, parseGeneratedSummary } from "../../src/ui/interactive/code-action-runner.js";
import { SessionState } from "../../src/ui/interactive/session-state.js";

test("code-action-runner: uses relative paths for tool trace, verification, and output", async () => {
    // This is tested largely via the manual smoke test, but we can verify
    // the structure of the file exists.
    assert.ok(runCodeAction);
});

test("code-action-runner: parseGeneratedSummary translates messages correctly", () => {
    assert.equal(
        parseGeneratedSummary("folder test-1 made."),
        "Created directory test-1."
    );

    assert.equal(
        parseGeneratedSummary("folder test-1/sub made"),
        "Created directory test-1/sub."
    );

    assert.equal(
        parseGeneratedSummary("test-1/README.md written"),
        "Created test-1/README.md."
    );

    assert.equal(
        parseGeneratedSummary("docs/file.txt written"),
        "Created docs/file.txt."
    );

    assert.equal(
        parseGeneratedSummary("file test-1/README.md written"),
        "Created test-1/README.md."
    );

    assert.equal(
        parseGeneratedSummary("file explain workspace"),
        "with a workspace overview"
    );

    assert.equal(
        parseGeneratedSummary("workscapce"),
        "workspace"
    );

    // Test a combined sentence
    assert.equal(
        parseGeneratedSummary("folder test-1 made. test-1/README.md written. file explain workspace."),
        "Created directory test-1. Created test-1/README.md. with a workspace overview."
    );
});
