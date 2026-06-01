import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderBrandHeader } from '../../../src/ui/interactive/render-brand.js';
import type { ShellState } from '../../../src/ui/interactive/shell-state.js';

describe('Interactive Shell Render', () => {
  test('header includes Needle, >_, and cwd', () => {
    let capturedOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      capturedOutput += msg + '\n';
    };

    try {
      const state: ShellState = {
        cwd: '/test/workspace',
        config: null,
        provider: undefined,
        profile: undefined,
        modelId: undefined
      };
      
      renderBrandHeader(state);
      
      assert.ok(capturedOutput.includes('Needle'));
      assert.ok(capturedOutput.includes('>_'));
      assert.ok(capturedOutput.includes('cwd: /test/workspace'));
      assert.ok(capturedOutput.includes('setup: not configured'));
      assert.ok(!capturedOutput.includes('█')); // No block ASCII
    } finally {
      console.log = originalLog;
    }
  });

  test('header shows provider and model when configured', () => {
    let capturedOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      capturedOutput += msg + '\n';
    };

    try {
      const state: ShellState = {
        cwd: '/test/workspace',
        config: {
          defaultProvider: '9router',
          models: { fast: 'test-model' },
          providers: { '9router': { baseUrl: 'http', apiKeyEnv: 'KEY' } }
        },
        provider: '9router',
        profile: 'fast',
        modelId: 'test-model'
      };
      
      renderBrandHeader(state);
      
      assert.ok(capturedOutput.includes('provider: 9router'));
      assert.ok(capturedOutput.includes('model: fast'));
      assert.ok(capturedOutput.includes('mode: Normal'));
      assert.ok(!capturedOutput.includes('KEY')); // No API key names or values printed directly
    } finally {
      console.log = originalLog;
    }
  });

  test('long cwd is shortened', () => {
    let capturedOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      capturedOutput += msg + '\n';
    };

    try {
      const longPath = '/very/long/path/that/exceeds/terminal/width/by/a/large/margin/so/it/should/be/truncated/here/in/the/output';
      const state: ShellState = {
        cwd: longPath,
        config: null,
        provider: undefined,
        profile: undefined,
        modelId: undefined
      };
      
      // Mock terminal width to ensure truncation
      const originalColumns = process.stdout.columns;
      process.stdout.columns = 80;
      
      renderBrandHeader(state);
      
      process.stdout.columns = originalColumns;
      
      assert.ok(!capturedOutput.includes(`cwd: ${longPath}`));
      assert.ok(capturedOutput.includes('...'));
    } finally {
      console.log = originalLog;
    }
  });
});