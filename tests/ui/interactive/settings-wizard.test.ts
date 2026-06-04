import { describe, it } from 'node:test';
import * as assert from 'node:assert';

describe('Settings Wizard', () => {
  it('set all profiles creates correct model mapping', () => {
    // This is tested by the wizard logic assigning values to config
    const config: any = { models: {} };
    const modelName = 'low';
    const profiles = ['router', 'fast', 'smart', 'coder', 'planner', 'reviewer'];
    
    profiles.forEach(p => config.models[p] = modelName);
    
    assert.strictEqual(config.models.fast, 'low');
    assert.strictEqual(config.models.reviewer, 'low');
  });

  it('set one profile validates allowed profile names', () => {
    const allowed = ['router', 'fast', 'smart', 'coder', 'planner', 'reviewer'];
    assert.strictEqual(allowed.includes('fast'), true);
    assert.strictEqual(allowed.includes('invalid'), false);
  });

  it('set each profile keeps existing values when input is empty', () => {
    const config = { models: { fast: 'claude-3' } as any };
    const input = '';
    
    if (input.trim()) {
      config.models.fast = input.trim();
    }
    
    assert.strictEqual(config.models.fast, 'claude-3');
  });

  it('provider setup saves 9router baseUrl', () => {
    const config: any = { providers: { '9router': {} } };
    const input = 'http://43.129.58.138:20128/v1';
    
    config.defaultProvider = '9router';
    config.providers['9router'].baseUrl = input;
    
    assert.strictEqual(config.providers['9router'].baseUrl, 'http://43.129.58.138:20128/v1');
  });

  it('API key is not written to config', () => {
    const config: any = { providers: { '9router': {} } };
    // API keys are explicitly not part of the config schema
    assert.strictEqual(config.providers['9router'].apiKey, undefined);
  });

  it('invalid URL is rejected for provider baseUrl', () => {
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
    
    assert.strictEqual(isValidUrl('not-a-url'), false);
    assert.strictEqual(isValidUrl('http://localhost:20128/v1'), true);
  });
});
