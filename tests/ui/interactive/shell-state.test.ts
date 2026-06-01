import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { createInitialShellState } from '../../../src/ui/interactive/shell-state.js';

describe('Shell State', () => {
  it('shell state defaults safely when config is missing', () => {
    const state = createInitialShellState('/mock/dir', null);
    
    assert.strictEqual(state.cwd, '/mock/dir');
    assert.strictEqual(state.config, null);
    assert.strictEqual(state.provider, null);
    assert.strictEqual(state.profile, null);
    assert.strictEqual(state.modelId, null);
  });

  it('shell state populates from config', () => {
    const mockConfig: any = {
      defaultProvider: 'openrouter'
    };
    
    const state = createInitialShellState('/mock/dir', mockConfig);
    
    assert.strictEqual(state.cwd, '/mock/dir');
    assert.strictEqual(state.config, mockConfig);
    assert.strictEqual(state.provider, 'openrouter');
    assert.strictEqual(state.profile, 'fast');
    assert.strictEqual(state.modelId, null);
  });
});