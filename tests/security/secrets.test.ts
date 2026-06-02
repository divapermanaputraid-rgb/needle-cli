import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { loadLocalSecrets, saveLocalSecret, clearLocalSecrets, getSecretStatus, forgetLocalSecret } from '../../src/ui/interactive/secrets.js';

describe('Local Secrets', () => {
  const needleDir = path.join(process.cwd(), '.needle');
  const secretsFile = path.join(needleDir, 'secrets.local.json');
  const configPath = path.join(needleDir, 'config.json');

  before(() => {
    if (fs.existsSync(secretsFile)) fs.unlinkSync(secretsFile);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    if (!fs.existsSync(needleDir)) fs.mkdirSync(needleDir);
    
    // Clear relevant env vars
    delete process.env.NINE_ROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  after(() => {
    if (fs.existsSync(secretsFile)) fs.unlinkSync(secretsFile);
    delete process.env.NINE_ROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  const getStatuses = () => [
    { name: 'NINE_ROUTER_API_KEY', status: getSecretStatus(process.cwd(), '9router') },
    { name: 'OPENAI_API_KEY', status: getSecretStatus(process.cwd(), 'openai-compatible') }
  ];

  it('1. saves NINE_ROUTER_API_KEY to .needle/secrets.local.json', () => {
    saveLocalSecret(process.cwd(), '9router', 'test-key-123');
    assert.ok(fs.existsSync(secretsFile));
    const content = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
    assert.equal(content.NINE_ROUTER_API_KEY, 'test-key-123');
  });

  it('2. does not save API key to .needle/config.json', () => {
    // Config should not be created or modified by saveLocalSecret
    assert.ok(!fs.existsSync(configPath) || !fs.readFileSync(configPath, 'utf8').includes('test-key-123'));
  });

  it('3. loads local secret into process.env when env missing', () => {
    delete process.env.NINE_ROUTER_API_KEY;
    loadLocalSecrets(process.cwd());
    assert.equal(process.env.NINE_ROUTER_API_KEY, 'test-key-123');
  });

  it('4. env var overrides local secret when env already set', () => {
    process.env.NINE_ROUTER_API_KEY = 'override-key-456';
    loadLocalSecrets(process.cwd());
    assert.equal(process.env.NINE_ROUTER_API_KEY, 'override-key-456');
  });

  it('5. secret values are redacted in status output', () => {
    const statuses = getStatuses();
    assert.ok(statuses.some(s => s.name === 'NINE_ROUTER_API_KEY' && s.status === 'set from environment')); // because we overrode it above
    
    // Test saved locally status
    delete process.env.NINE_ROUTER_API_KEY;
    loadLocalSecrets(process.cwd());
    const statuses2 = getStatuses();
    assert.ok(statuses2.some(s => s.name === 'NINE_ROUTER_API_KEY' && s.status === 'saved locally'));
    
    // Ensure no values are in the output
    const statusString = JSON.stringify(statuses2);
    assert.ok(!statusString.includes('test-key-123'));
    assert.ok(!statusString.includes('override-key-456'));
  });

  it('6. /secrets shows set/missing without values (via getSecretStatus)', () => {
    const statuses = getStatuses();
    const missing = statuses.find(s => s.name === 'OPENAI_API_KEY');
    assert.equal(missing?.status, 'missing');
    assert.ok(!JSON.stringify(statuses).includes('test-key-123'));
  });
  
  it('forget local secret removes it', () => {
    forgetLocalSecret(process.cwd(), 'NINE_ROUTER_API_KEY');
    const content = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
    assert.equal(content.NINE_ROUTER_API_KEY, undefined);
  });

  it('7. /secrets clear removes local secret file', () => {
    saveLocalSecret(process.cwd(), 'openai-compatible', 'test-key-abc');
    assert.ok(fs.existsSync(secretsFile));
    clearLocalSecrets(process.cwd());
    assert.ok(!fs.existsSync(secretsFile));
  });

  it('8. saved secret file is chmod 600 when platform allows', () => {
    saveLocalSecret(process.cwd(), '9router', 'chmod-test');
    if (process.platform !== 'win32') {
      const stats = fs.statSync(secretsFile);
      const mode = stats.mode & 0o777; // get permission bits
      assert.equal(mode, 0o600);
    }
  });

  it('10. missing secrets file does not crash', () => {
    clearLocalSecrets(process.cwd()); // ensures it doesn't exist
    assert.doesNotThrow(() => loadLocalSecrets(process.cwd()));
  });
});