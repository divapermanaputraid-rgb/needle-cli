import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getEnvVarName, setSessionSecret, getSessionSecret } from '../../../src/ui/interactive/secrets.js';

describe('Secrets', () => {
  it('returns correct env var names', () => {
    assert.strictEqual(getEnvVarName('9router'), 'NINE_ROUTER_API_KEY');
    assert.strictEqual(getEnvVarName('openrouter'), 'OPENROUTER_API_KEY');
    assert.strictEqual(getEnvVarName('openai-compatible'), 'OPENAI_API_KEY');
    assert.strictEqual(getEnvVarName('gemini'), 'GEMINI_API_KEY');
    assert.strictEqual(getEnvVarName('deepseek'), 'DEEPSEEK_API_KEY');
    assert.strictEqual(getEnvVarName('unknown'), undefined);
  });

  it('sets and gets session secrets in process.env', () => {
    const provider = 'openrouter';
    const originalEnv = process.env.OPENROUTER_API_KEY;
    
    try {
      setSessionSecret(provider, 'test-key-123');
      assert.strictEqual(process.env.OPENROUTER_API_KEY, 'test-key-123');
      assert.strictEqual(getSessionSecret(provider), 'test-key-123');
    } finally {
      // restore
      process.env.OPENROUTER_API_KEY = originalEnv;
    }
  });

  it('returns undefined for unknown provider secret', () => {
    assert.strictEqual(getSessionSecret('unknown-provider'), undefined);
  });
});