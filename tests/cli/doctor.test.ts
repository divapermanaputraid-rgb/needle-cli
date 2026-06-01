import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../../dist/index.js');

function runDoctor(cwd: string, env: Record<string, string> = {}) {
  try {
    return execSync(`node ${cliPath} doctor`, {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (error: any) {
    // If command fails with non-zero exit code, execSync throws.
    // Return the stdout or stderr to assert against it.
    return (error.stdout?.toString() || "") + (error.stderr?.toString() || "");
  }
}

describe('Doctor Command', () => {
  test('doctor command registers without crash and missing config prints next step needle init', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const output = runDoctor(tempDir);
      
      // 1. registers without crash
      assert.ok(output.includes('Needle Doctor'), "Doctor command header missing");
      
      // 2. missing config prints next step needle init
      assert.ok(output.includes('FAIL .needle/config.json missing'));
      assert.ok(output.includes('- needle init'), "Missing needle init suggestion");
      
      // 6. memory/session missing produce WARN not crash
      assert.ok(output.includes('WARN .needle/MEMORY.md missing'));
      assert.ok(output.includes('INFO .needle/sessions/runs.jsonl missing'));

      // 8. output contains overall status
      assert.ok(output.includes('Overall: FAIL'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('openrouter missing API key reports env var name but not value, models configured/missing', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const needleDir = path.join(tempDir, '.needle');
      fs.mkdirSync(needleDir);
      fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({
        defaultProvider: "openrouter",
        models: {
          fast: "openrouter/fast-model"
        }
      }));

      // Unset OPENROUTER_API_KEY explicitly
      const env = { OPENROUTER_API_KEY: "" };
      const output = runDoctor(tempDir, env);

      // 3. openrouter missing API key reports env var name but not value
      assert.ok(output.includes('INFO active provider API key env name: OPENROUTER_API_KEY'));
      assert.ok(output.includes('FAIL env var is missing'));
      assert.ok(output.includes('- export OPENROUTER_API_KEY="your_key"'));

      // 5. model profiles show configured/missing
      assert.ok(output.includes('OK fast: configured (openrouter/fast-model)'));
      assert.ok(output.includes('WARN smart: missing'));
      assert.ok(output.includes('- needle config set model.smart <modelId>'));
      
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('9router missing baseUrl reports provider baseUrl next step (suggests localhost), env set shows set without printing value', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const needleDir = path.join(tempDir, '.needle');
      fs.mkdirSync(needleDir);
      fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({
        defaultProvider: "9router"
      }));

      // 7. API key env set shows set without printing value
      const env = { NINE_ROUTER_API_KEY: "secret123_never_print_this" };
      const output = runDoctor(tempDir, env);

      // 4. 9router missing baseUrl reports provider baseUrl next step
      assert.ok(output.includes('FAIL active provider baseUrl status: missing'));
      assert.ok(output.includes('- needle config set providers.9router.baseUrl http://localhost:20128/v1'));

      // 7. verification
      assert.ok(output.includes('OK env var is set'));
      assert.ok(!output.includes('secret123_never_print_this'), "API key leaked in output!");
      
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('9router missing key explains gateway key vs upstream provider key', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const needleDir = path.join(tempDir, '.needle');
      fs.mkdirSync(needleDir);
      fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({
        defaultProvider: "9router",
        providers: {
          "9router": {
            baseUrl: "http://43.129.58.138:20128/v1",
            apiKeyEnv: "NINE_ROUTER_API_KEY"
          }
        }
      }));

      const env = { NINE_ROUTER_API_KEY: "" };
      const output = runDoctor(tempDir, env);

      assert.ok(output.includes('NINE_ROUTER_API_KEY is the 9Router gateway/API access key, not an upstream provider key'), "Missing correct remote key message");
      assert.ok(output.includes('- export NINE_ROUTER_API_KEY="your_9router_gateway_key"'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('remote 9router without key is FAIL', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const needleDir = path.join(tempDir, '.needle');
      fs.mkdirSync(needleDir);
      fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({
        defaultProvider: "9router",
        providers: {
          "9router": {
            baseUrl: "http://43.129.58.138:20128/v1"
          }
        }
      }));

      const env = { NINE_ROUTER_API_KEY: "" };
      const output = runDoctor(tempDir, env);

      assert.ok(output.includes('Overall: FAIL'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('local 9router without key is WARN', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-'));
    try {
      const needleDir = path.join(tempDir, '.needle');
      fs.mkdirSync(needleDir);
      fs.writeFileSync(path.join(needleDir, 'config.json'), JSON.stringify({
        defaultProvider: "9router",
        providers: {
          "9router": {
            baseUrl: "http://localhost:20128/v1",
            apiKeyEnv: "NINE_ROUTER_API_KEY"
          }
        }
      }));

      const env = { NINE_ROUTER_API_KEY: "" };
      const output = runDoctor(tempDir, env);

      assert.ok(output.includes('local 9Router may allow no-auth depending on your gateway config'), "Missing correct local key message");
      // Note: "WARN" doesn't force overall status to FAIL unless something else failed.
      // But we just verify the message is present.
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});