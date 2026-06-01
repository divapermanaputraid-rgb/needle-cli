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

  it('handles /chat command without args gracefully', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/chat', state, mockSession);
    assert.strictEqual(handled, true);
  });
  
  it('handles /help', async () => {
    const state: ShellState = { cwd: tmpCwd, history: [] };
    const mockSession = {} as any;
    const handled = await handleSlashCommand('/help', state, mockSession);
    assert.strictEqual(handled, true);
  });
});
