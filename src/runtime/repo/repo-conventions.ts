import * as fs from 'fs';
import * as path from 'path';

export interface RepoConventions {
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  testCommand?: string;
  typecheckCommand?: string;
  buildCommand?: string;
  testFramework: "node:test" | "vitest" | "jest" | "bun:test" | "unknown";
  assertionLibrary?: "node:assert/strict" | "expect" | "unknown";
  sourceDirs: string[];
  testDirs: string[];
  conventionsSummary: string;
}

export function detectRepoConventions(cwd: string): RepoConventions {
  let packageManager: RepoConventions['packageManager'] = 'unknown';
  let testCommand: string | undefined;
  let typecheckCommand: string | undefined;
  let buildCommand: string | undefined;
  let testFramework: RepoConventions['testFramework'] = 'unknown';
  let assertionLibrary: RepoConventions['assertionLibrary'] = 'unknown';
  const sourceDirs: string[] = ['src'];
  const testDirs: string[] = ['tests', 'test'];

  // Detect Package Manager
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock'))) {
    packageManager = 'bun';
  } else if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    packageManager = 'npm';
  }

  const pkgManagerPrefix = packageManager === 'unknown' ? 'npm run' : (packageManager === 'npm' ? 'npm run' : packageManager);

  // Read package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts) {
        if (pkg.scripts.test) testCommand = `${pkgManagerPrefix} test`;
        if (pkg.scripts.typecheck) typecheckCommand = `${pkgManagerPrefix} typecheck`;
        if (pkg.scripts.build) buildCommand = `${pkgManagerPrefix} build`;
      }
      
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps['vitest']) testFramework = 'vitest';
      else if (allDeps['jest']) testFramework = 'jest';
    } catch (e) {
      // ignore
    }
  }

  // Detect from tests if still unknown
  if (testFramework === 'unknown' || assertionLibrary === 'unknown') {
    for (const testDir of testDirs) {
      const fullTestDir = path.join(cwd, testDir);
      if (fs.existsSync(fullTestDir)) {
        try {
          const files = fs.readdirSync(fullTestDir, { recursive: true }) as string[];
          for (const file of files) {
            if (file.endsWith('.test.ts') || file.endsWith('.spec.ts') || file.endsWith('.test.js')) {
              const content = fs.readFileSync(path.join(fullTestDir, file), 'utf8');
              if (content.includes('node:test')) testFramework = 'node:test';
              if (content.includes('vitest')) testFramework = 'vitest';
              if (content.includes('bun:test')) testFramework = 'bun:test';
              
              if (content.includes('node:assert/strict')) assertionLibrary = 'node:assert/strict';
              else if (content.includes('expect')) assertionLibrary = 'expect';
              
              if (testFramework !== 'unknown' && assertionLibrary !== 'unknown') {
                break;
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      if (testFramework !== 'unknown' && assertionLibrary !== 'unknown') {
        break;
      }
    }
  }

  let conventionsSummary = `Repository Conventions:\n`;
  conventionsSummary += `* Package manager: ${packageManager}\n`;
  conventionsSummary += `* Test framework: ${testFramework}\n`;
  if (assertionLibrary && assertionLibrary !== 'unknown') {
    conventionsSummary += `* Assertion library: ${assertionLibrary}\n`;
  }
  if (typecheckCommand) {
    conventionsSummary += `* Typecheck: ${typecheckCommand}\n`;
  }
  if (testCommand) {
    conventionsSummary += `* Test: ${testCommand}\n`;
  }

  if (testFramework === 'node:test') {
    conventionsSummary += `* Do not use vitest.\n`;
    conventionsSummary += `* Do not use bun:test.\n`;
  }

  return {
    packageManager,
    testCommand,
    typecheckCommand,
    buildCommand,
    testFramework,
    assertionLibrary,
    sourceDirs,
    testDirs,
    conventionsSummary
  };
}