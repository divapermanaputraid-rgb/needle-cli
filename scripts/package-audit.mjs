#!/usr/bin/env node
/**
 * Fail-closed audit for Needle's stable npm package.
 * Run: node scripts/package-audit.mjs
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_PACKAGE_FILES = [
  "assets/needle-hero.png",
  "assets/needle-icon.png",
  "assets/needle-wordmark.png",
  "CHANGELOG.md",
  "dist/index.d.ts",
  "dist/index.js",
  "LICENSE",
  "package.json",
  "README.md",
];

export const EXPECTED_DIST_FILES = [
  "index.d.ts",
  "index.js",
];

const FORBIDDEN_FILE_PATTERNS = [
  { label: "source map", pattern: /\.map$/i },
  { label: "environment file", pattern: /(^|\/)\.env($|\.)/i },
  { label: "Claude reference", pattern: /(^|\/)claude-leaks(\/|$)/i },
  { label: "internal development notes", pattern: /(^|\/)internal-dev-notes(\/|$)/i },
  { label: "Needle local state", pattern: /(^|\/)\.needle(\/|$)/i },
  { label: "experimental source", pattern: /(^|\/)src-v2(\/|$)/i },
  { label: "reference source", pattern: /(^|\/)reference(\/|$)/i },
  { label: "experimental database", pattern: /(^|\/)\.needle-v2\.db$/i },
  { label: "local secrets", pattern: /(^|\/)secrets\.local\.json$/i },
];

const FORBIDDEN_CONTENT_CHECKS = [
  { label: "Claude reference marker", pattern: /claude-leaks/i },
  { label: "internal development marker", pattern: /internal-dev-notes/i },
  { label: "source leak marker", pattern: /source leak|leaked source|based on leaked/i },
  { label: "source map marker", pattern: /[#@]\s*sourceMappingURL\s*=/i },
  { label: "old Fungi name", pattern: /fungicode|fungi-cli|Fungi CLI|(?<!\.)fungi\b|\.fungi/i },
  { label: "experimental database marker", pattern: /\.needle-v2\.db/i },
  { label: "experimental source marker", pattern: /src-v2[\\/]/i },
  { label: "experimental database service", pattern: /@needle\/Database/i },
  { label: "experimental MCP test marker", pattern: /MCP TEST|MCP Server executed:/i },
  { label: "experimental security module", pattern: /security-ast/i },
  { label: "experimental TUI entry", pattern: /run-tui/i },
  {
    label: "API key",
    pattern: /(?<!NINE_ROUTER_)(?<!OPENROUTER_)sk-[a-zA-Z0-9]{32,}/,
  },
  {
    label: "configured secret",
    pattern: /(?<!NINE_ROUTER_)(?<!OPENROUTER_)(["']?)(api_key|secret_key|private_key)\1\s*:\s*["'][^"']+["']/i,
  },
  { label: "OpenRouter key", pattern: /sk-or-v1-[a-zA-Z0-9]{60,}/ },
  { label: "bearer token", pattern: /Bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/ },
  { label: "private key", pattern: /BEGIN .*PRIVATE KEY/ },
];

const TEXT_PACKAGE_FILES = new Set([
  "CHANGELOG.md",
  "dist/index.d.ts",
  "dist/index.js",
  "LICENSE",
  "package.json",
  "README.md",
]);

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function readPackedFiles(cwd) {
  const output = execFileSync(
    "npm",
    ["pack", "--dry-run", "--ignore-scripts", "--json"],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const parsed = JSON.parse(output);
  const files = parsed?.[0]?.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("npm pack returned no file metadata");
  }
  const paths = files.map((file) => file?.path);
  if (paths.some((file) => typeof file !== "string" || file.length === 0)) {
    throw new Error("npm pack returned invalid file metadata");
  }
  return paths;
}

function addFilePolicyErrors(files, errors) {
  for (const file of files) {
    for (const { label, pattern } of FORBIDDEN_FILE_PATTERNS) {
      if (pattern.test(file)) {
        errors.push(`Forbidden ${label} in package: ${file}`);
      }
    }
  }
}

function addExactPackageErrors(files, errors) {
  const actual = new Set(files);
  const expected = new Set(EXPECTED_PACKAGE_FILES);

  for (const file of EXPECTED_PACKAGE_FILES) {
    if (!actual.has(file)) errors.push(`Missing expected package file: ${file}`);
  }
  for (const file of files) {
    if (!expected.has(file)) errors.push(`Unexpected package file: ${file}`);
  }
  if (actual.size !== files.length) {
    errors.push("Package file metadata contains duplicate paths");
  }
}

function addDistShapeErrors(cwd, errors) {
  const distDir = path.join(cwd, "dist");
  if (!existsSync(distDir)) {
    errors.push("Missing local dist directory");
    return [];
  }

  const entries = sorted(readdirSync(distDir));
  const expected = new Set(EXPECTED_DIST_FILES);
  for (const file of EXPECTED_DIST_FILES) {
    if (!entries.includes(file)) errors.push(`Missing expected dist file: dist/${file}`);
  }
  for (const file of entries) {
    if (!expected.has(file)) errors.push(`Unexpected local dist entry: dist/${file}`);
  }
  return entries
    .map((file) => path.join(distDir, file))
    .filter((file) => statSync(file).isFile());
}

function addContentErrors(file, displayPath, errors) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch (error) {
    errors.push(`Could not scan ${displayPath}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  for (const { label, pattern } of FORBIDDEN_CONTENT_CHECKS) {
    if (pattern.test(content)) {
      errors.push(`Forbidden ${label} found in: ${displayPath}`);
    }
  }
}

export function auditPackage(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const errors = [];
  let packedFiles = options.packedFiles;

  if (!packedFiles) {
    try {
      packedFiles = readPackedFiles(cwd);
    } catch (error) {
      errors.push(`Could not inspect npm pack metadata: ${error instanceof Error ? error.message : String(error)}`);
      packedFiles = [];
    }
  }

  addFilePolicyErrors(packedFiles, errors);
  addExactPackageErrors(packedFiles, errors);

  const localDistFiles = addDistShapeErrors(cwd, errors);
  const scanned = new Set();
  for (const file of localDistFiles) {
    const displayPath = path.relative(cwd, file);
    addContentErrors(file, displayPath, errors);
    scanned.add(displayPath);
  }

  for (const file of packedFiles) {
    if (!TEXT_PACKAGE_FILES.has(file) || scanned.has(file)) continue;
    const fullPath = path.join(cwd, file);
    if (!existsSync(fullPath)) {
      errors.push(`Packed text file is missing locally: ${file}`);
      continue;
    }
    addContentErrors(fullPath, file, errors);
  }

  return {
    ok: errors.length === 0,
    errors,
    packedFiles: sorted(packedFiles),
  };
}

function printAuditResult(result) {
  console.log("Needle package audit starting...\n");
  if (!result.ok) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    console.error("\nPackage audit FAILED. Do not publish.\n");
    return;
  }

  console.log(`Package file allowlist clean (${result.packedFiles.length} files checked)`);
  console.log(`Local dist allowlist clean (${EXPECTED_DIST_FILES.length} files checked)`);
  console.log("Package content scan clean");
  console.log("\nPackage audit passed. Publish boundary is clean.\n");
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isMain) {
  const result = auditPackage();
  printAuditResult(result);
  process.exit(result.ok ? 0 : 1);
}
