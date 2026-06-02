import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveLocalSecret,
  loadLocalSecrets,
  clearLocalSecrets,
  forgetLocalSecret,
  getSecretStatus,
  getEnvVarName
} from '../../src/ui/interactive/secrets.js';

test('Secrets Management', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'needle-test-secrets-'));
  const secretsPath = path.join(tmpDir, '.needle', 'secrets.local.json');
  
  // Cleanup
  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env['NINE_ROUTER_API_KEY'];
    delete process.env['OPENROUTER_API_KEY'];
  });

  await t.test('getEnvVarName returns correct vars', () => {
    assert.equal(getEnvVarName('9router'), 'NINE_ROUTER_API_KEY');
    assert.equal(getEnvVarName('openrouter'), 'OPENROUTER_API_KEY');
    assert.equal(getEnvVarName('openai-compatible'), 'OPENAI_API_KEY');
    assert.equal(getEnvVarName('unknown'), undefined);
  });

  await t.test('saveLocalSecret writes to file', () => {
    saveLocalSecret(tmpDir, '9router', 'test-secret-123');
    
    assert.ok(fs.existsSync(secretsPath), 'Secrets file should exist');
    const content = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    assert.equal(content['NINE_ROUTER_API_KEY'], 'test-secret-123');
  });

  await t.test('loadLocalSecrets sets process.env but does not overwrite', () => {
    // 1. Should load the saved secret
    delete process.env['NINE_ROUTER_API_KEY'];
    loadLocalSecrets(tmpDir);
    assert.equal(process.env['NINE_ROUTER_API_KEY'], 'test-secret-123');

    // 2. Should NOT overwrite existing env var
    process.env['OPENROUTER_API_KEY'] = 'existing-key';
    saveLocalSecret(tmpDir, 'openrouter', 'new-local-key');
    
    loadLocalSecrets(tmpDir);
    assert.equal(process.env['OPENROUTER_API_KEY'], 'existing-key', 'Should not overwrite existing env var');
  });

  await t.test('getSecretStatus returns correct status', () => {
    // Both env and local
    assert.equal(getSecretStatus(tmpDir, 'openrouter'), 'set from environment');
    
    // Only local (simulated by clearing env)
    delete process.env['OPENROUTER_API_KEY'];
    assert.equal(getSecretStatus(tmpDir, 'openrouter'), 'saved locally');
    
    // Missing
    assert.equal(getSecretStatus(tmpDir, 'gemini'), 'missing');
  });

  await t.test('forgetLocalSecret removes specific key', () => {
    forgetLocalSecret(tmpDir, 'NINE_ROUTER_API_KEY');
    
    const content = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    assert.equal(content['NINE_ROUTER_API_KEY'], undefined);
    assert.equal(content['OPENROUTER_API_KEY'], 'new-local-key');
  });

  await t.test('clearLocalSecrets removes file entirely', () => {
    clearLocalSecrets(tmpDir);
    assert.equal(fs.existsSync(secretsPath), false);
  });
});
