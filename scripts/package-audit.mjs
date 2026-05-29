#!/usr/bin/env node
/**
 * Needle package audit script.
 * Fails if risky files or forbidden strings appear in the publish candidates.
 * Run: node scripts/package-audit.mjs
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

const FORBIDDEN_FILE_PATTERNS = [
  /\.map$/,
  /\.env/,
  /claude-leaks/,
  /internal-dev-notes/,
  /^package\/src\//,
];

const FORBIDDEN_STRINGS = [
  "claude-leaks",
  "internal-dev-notes",
  "source leak",
  "leaked source",
  "based on leaked",
];

const FORBIDDEN_REGEX = [
  /sk-[a-zA-Z0-9]{32,}/, // Typical API key pattern
  /(["']?)(api_key|secret_key|private_key)\1\s*:\s*["'][^"']+["']/i,
];

let failed = false;

console.log("🪡 Needle package audit starting...\n");

// --- Step 1: Check packed file list ---
let packedFiles = [];
try {
  const output = execSync("npm pack --dry-run --ignore-scripts --json 2>/dev/null", {
    encoding: "utf8",
  });
  const parsed = JSON.parse(output);
  packedFiles = parsed[0]?.files?.map((f) => f.path) ?? [];
} catch {
  // fallback: list dist/
  console.warn(
    "⚠  Could not run npm pack --dry-run, skipping file list check.\n"
  );
}

for (const file of packedFiles) {
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(file)) {
      console.error(`❌ FORBIDDEN FILE in package: ${file}`);
      failed = true;
    }
  }
}

if (packedFiles.length > 0 && !failed) {
  console.log(`✅ File list clean (${packedFiles.length} files checked)\n`);
}

// --- Step 2: Scan dist/ for forbidden strings ---
let distFiles = [];
try {
  const raw = execSync('find dist -type f -name "*.js" 2>/dev/null', {
    encoding: "utf8",
  });
  distFiles = raw.trim().split("\n").filter(Boolean);
} catch {
  console.warn("⚠  dist/ not found, skipping content scan.\n");
}

for (const file of distFiles) {
  const content = readFileSync(file, "utf8");
  for (const s of FORBIDDEN_STRINGS) {
    if (content.includes(s)) {
      console.error(`❌ FORBIDDEN STRING "${s}" found in: ${file}`);
      failed = true;
    }
  }
  for (const r of FORBIDDEN_REGEX) {
    if (r.test(content)) {
      console.error(`❌ FORBIDDEN PATTERN match found in: ${file}`);
      failed = true;
    }
  }
}

if (distFiles.length > 0 && !failed) {
  console.log(`✅ Content scan clean (${distFiles.length} JS files)\n`);
}

// --- Step 3: Check README for forbidden strings ---
try {
  const readme = readFileSync("README.md", "utf8");
  for (const s of FORBIDDEN_STRINGS) {
    if (readme.toLowerCase().includes(s.toLowerCase())) {
      console.error(`❌ FORBIDDEN STRING "${s}" found in README.md`);
      failed = true;
    }
  }
  if (!failed) console.log("✅ README.md clean\n");
} catch {
  console.warn("⚠  README.md not found\n");
}

if (failed) {
  console.error("\n🚫 Package audit FAILED. Fix issues before publishing.\n");
  process.exit(1);
} else {
  console.log("✅ Package audit passed. Safe to publish.\n");
  process.exit(0);
}