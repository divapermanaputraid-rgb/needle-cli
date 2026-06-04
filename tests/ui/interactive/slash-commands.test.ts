import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { handleSlashCommand } from '../../../src/ui/interactive/slash-commands.js';
import { ShellState } from '../../../src/ui/interactive/shell-state.js';

import * as os from 'node:os';
import * as path from 'node:path';

describe('Slash Commands', () => {
  const tmpCwd = os.tmpdir();
  
  it('handles /settings command without rl gracefully', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/settings', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /connect command as alias for settings', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/connect', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /model all low', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/model all low', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /model coder high', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/model coder high', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /model without args', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/model', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /provider without args', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/provider', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /plan command', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/plan build a house', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles review-like text routes to normal chat unless slash command is /review', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('review this code', state, mockSession);
    assert.strictEqual(handled, false);
    
    const handledReviewCmd = await handleSlashCommand('/review', state, mockSession);
    assert.strictEqual(handledReviewCmd, true);
  });
  
  it('handles /help', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/help', state, mockSession);
    assert.strictEqual(handled, true);
  });

  it('handles /pwd', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    
    // Capture console.log
    const originalLog = console.log;
    let logOutput = '';
    console.log = (msg: string) => { logOutput += msg + '\n'; };
    
    const handled = await handleSlashCommand('/pwd', state, mockSession);
    console.log = originalLog;
    
    assert.strictEqual(handled, true);
    assert.ok(logOutput.includes('Current Working Directory:'));
    assert.ok(logOutput.includes(tmpCwd));
  });

  it('handles /whoami and hides absolute homedir paths', async () => {
    const home = process.env.HOME || os.homedir();
    // Force a mock path within home directory
    const state: ShellState = { cwd: path.join(home, 'my-project'), history: [] };
    const mockSession = {} as any;
    
    const originalLog = console.log;
    let logOutput = '';
    console.log = (msg: string) => { logOutput += msg + '\n'; };
    
    const handled = await handleSlashCommand('/whoami', state, mockSession);
    console.log = originalLog;
    
    assert.strictEqual(handled, true);
    assert.ok(logOutput.includes('Active Identity:'));
    
    // The raw home directory path should not be present in output, it should be replaced with ~
    assert.ok(!logOutput.includes(home));
    assert.ok(logOutput.includes('~/my-project'));
  });
});
