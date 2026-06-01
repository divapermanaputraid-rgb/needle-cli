import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import { handleSlashCommand } from '../../../src/ui/interactive/slash-commands.js';
import { ShellState } from '../../../src/ui/interactive/shell-state.js';

describe('Slash Commands', () => {
  let mockState: ShellState;
  let logOutput: string[] = [];
  let clearCalled = false;
  let exitCode: number | undefined;

  const originalLog = console.log;
  const originalClear = console.clear;
  const originalExit = process.exit;

  beforeEach(() => {
    logOutput = [];
    clearCalled = false;
    exitCode = undefined;
    
    mockState = {
      cwd: '/mock/dir',
      config: null,
      provider: 'mock-provider',
      profile: 'fast',
      modelId: null
    };
    
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    
    console.clear = () => {
      clearCalled = true;
    };
    
    (process as any).exit = (code: number) => {
      exitCode = code;
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.clear = originalClear;
    process.exit = originalExit;
  });

  it('slash parser detects /help', () => {
    const result = handleSlashCommand('/help', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Available Commands')));
  });

  it('slash parser detects /exit', () => {
    const result = handleSlashCommand('/exit', mockState);
    assert.strictEqual(result, true);
    assert.strictEqual(exitCode, 0);
  });

  it('slash parser detects /status', () => {
    const result = handleSlashCommand('/status', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('System Status')));
    assert.ok(logOutput.some(msg => msg.includes('mock-provider')));
  });

  it('slash parser detects /model coder low when config missing', () => {
    const result = handleSlashCommand('/model coder low', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Config missing. Run: needle init')));
  });

  it('slash parser detects /provider 9router when config missing', () => {
    const result = handleSlashCommand('/provider 9router', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Config missing. Run: needle init')));
  });

  it('slash parser detects /models when config missing', () => {
    const result = handleSlashCommand('/models', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Config missing. Run: needle init')));
  });

  it('slash parser detects /models when config present', () => {
    mockState.config = {
      defaultProvider: 'openrouter',
      models: {
        fast: 'fast-model',
        smart: 'smart-model',
        coder: 'coder-model',
        planner: 'planner-model',
        reviewer: 'reviewer-model'
      },
      permissions: { mode: 'ask' }
    };
    const result = handleSlashCommand('/models', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Configured Models:')));
    assert.ok(logOutput.some(msg => msg.includes('fast: fast-model')));
  });

  it('slash parser detects /model coder low when config present', () => {
    mockState.config = {
      defaultProvider: 'openrouter',
      models: {
        fast: 'fast-model',
        smart: 'smart-model',
        coder: 'coder-model',
        planner: 'planner-model',
        reviewer: 'reviewer-model'
      },
      permissions: { mode: 'ask' }
    };
    const result = handleSlashCommand('/model coder low', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('set model.coder low')));
  });

  it('slash parser detects /provider 9router when config present', () => {
    mockState.config = {
      defaultProvider: 'openrouter',
      models: {
        fast: 'fast-model',
        smart: 'smart-model',
        coder: 'coder-model',
        planner: 'planner-model',
        reviewer: 'reviewer-model'
      },
      permissions: { mode: 'ask' }
    };
    const result = handleSlashCommand('/provider 9router', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('set provider 9router')));
  });

  it('slash parser detects /plan task', () => {
    const result = handleSlashCommand('/plan inspect project', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('needle plan "inspect project"')));
  });

  it('slash parser detects /code task', () => {
    const result = handleSlashCommand('/code fix lint errors', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('needle code "fix lint errors"')));
  });

  it('invalid slash command returns helpful error', () => {
    const result = handleSlashCommand('/unknown', mockState);
    assert.strictEqual(result, true);
    assert.ok(logOutput.some(msg => msg.includes('Unknown command: /unknown')));
    assert.ok(logOutput.some(msg => msg.includes('Type /help for a list of commands')));
  });
});