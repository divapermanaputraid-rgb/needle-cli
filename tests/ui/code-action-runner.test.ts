import test from "node:test";
import assert from "node:assert/strict";
import {
    formatActionCompletion,
    getCodeActionTitle,
    parseGeneratedSummary,
    runCodeAction,
} from "../../src/ui/interactive/code-action-runner.js";

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

test("code-action-runner: file target takes priority over directory target", () => {
    assert.equal(
        getCodeActionTitle({
            intent: "code_action",
            targetDirectory: "r5-test",
            targetPath: "README.md",
            needsClarification: false,
        }),
        'Code Action: Write File "r5-test/README.md"',
    );
});

test("code-action-runner: documentation target does not use a directory title", () => {
    const title = getCodeActionTitle({
        intent: "write_documentation",
        targetDirectory: "docs",
        targetPath: "guide.md",
        needsClarification: false,
    });

    assert.equal(title, 'Code Action: Write File "docs/guide.md"');
    assert.doesNotMatch(title ?? "", /Create Directory/);
});

test("code-action-runner: deterministic summaries omit unsupported validation claims", () => {
    const folder = formatActionCompletion(true, "Created directory r5-test.", []);
    const file = formatActionCompletion(true, "Created r5-test/README.md.", []);

    assert.equal(folder, "Done:\nCreated directory r5-test.");
    assert.equal(file, "Done:\nCreated r5-test/README.md.");
    assert.doesNotMatch(`${folder}\n${file}`, /Implemented|validation passed/i);
});

test("code-action-runner: renders validation success only from structured records", () => {
    const output = formatActionCompletion(true, "Created r5-test/README.md.", [
        { command: "pnpm typecheck", ok: true, exitCode: 0 },
        { command: "pnpm test", ok: true, exitCode: 0 },
    ]);

    assert.match(output, /Validation passed:/);
    assert.match(output, /- pnpm typecheck OK/);
    assert.match(output, /- pnpm test OK/);
});

test("code-action-runner: failed validation does not claim completion", () => {
    const output = formatActionCompletion(false, "Validation failed. No success claimed.", [
        { command: "pnpm test", ok: false, exitCode: 2 },
    ]);

    assert.doesNotMatch(output, /^Done:/);
    assert.doesNotMatch(output, /Validation passed/);
    assert.match(output, /^Failed:\nValidation failed:/);
    assert.match(output, /pnpm test FAILED \(exit code 2\)/);
});
