import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  auditPackage,
  EXPECTED_PACKAGE_FILES,
} from "../../scripts/package-audit.mjs";

function safeContent(file: string): string | Buffer {
  if (file.endsWith(".png")) return Buffer.from([0]);
  if (file === "package.json") return '{"name":"needle-audit-fixture"}\n';
  if (file === "dist/index.js") return 'console.log("Needle stable");\n';
  if (file === "dist/index.d.ts") return "export {};\n";
  return "Needle stable package fixture.\n";
}

async function createSafeFixture(): Promise<string> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "needle-package-audit-"));
  for (const file of EXPECTED_PACKAGE_FILES) {
    const fullPath = path.join(cwd, file);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, safeContent(file));
  }
  return cwd;
}

test("package audit accepts only the exact stable publish allowlist", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));

  const result = auditPackage({ cwd, packedFiles: [...EXPECTED_PACKAGE_FILES] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("package audit rejects an unexpected run-tui dist chunk", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.writeFile(path.join(cwd, "dist/run-tui-ABC123.js"), "export {};\n");

  const result = auditPackage({
    cwd,
    packedFiles: [...EXPECTED_PACKAGE_FILES, "dist/run-tui-ABC123.js"],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /run-tui-ABC123\.js/.test(error)));
});

test("package audit rejects a V2 marker inside stable dist content", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.writeFile(path.join(cwd, "dist/index.js"), 'const database = ".needle-v2.db";\n');

  const result = auditPackage({ cwd, packedFiles: [...EXPECTED_PACKAGE_FILES] });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /experimental database marker/.test(error)));
});

test("package audit rejects source maps", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.writeFile(path.join(cwd, "dist/index.js.map"), "{}\n");

  const result = auditPackage({
    cwd,
    packedFiles: [...EXPECTED_PACKAGE_FILES, "dist/index.js.map"],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /source map/.test(error)));
});

test("package audit rejects source map markers in stable dist content", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.writeFile(path.join(cwd, "dist/index.js"), "//# sourceMappingURL=index.js.map\n");

  const result = auditPackage({ cwd, packedFiles: [...EXPECTED_PACKAGE_FILES] });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /source map marker/.test(error)));
});

test("package audit rejects reference content", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  await fs.mkdir(path.join(cwd, "reference"), { recursive: true });
  await fs.writeFile(path.join(cwd, "reference/notes.md"), "internal reference\n");

  const result = auditPackage({
    cwd,
    packedFiles: [...EXPECTED_PACKAGE_FILES, "reference/notes.md"],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /reference source/.test(error)));
});

test("package audit rejects a missing expected file", async (t) => {
  const cwd = await createSafeFixture();
  t.after(() => fs.rm(cwd, { recursive: true, force: true }));
  const packedFiles = EXPECTED_PACKAGE_FILES.filter((file) => file !== "README.md");

  const result = auditPackage({ cwd, packedFiles });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /Missing expected package file: README\.md/.test(error)));
});
