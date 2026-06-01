import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInteractiveChat } from '../../../src/ui/interactive/interactive-chat.js';
import { ChatSession } from '../../../src/ui/interactive/chat-session.js';
import type { ShellState } from '../../../src/ui/interactive/shell-state.js';

test('interactive chat without config prints guidance', async () => {
  const state: ShellState = { cwd: process.cwd() };
  const session = new ChatSession();
  
  const oldLog = console.log;
  let logged = '';
  console.log = (msg) => { logged += msg + '\n'; };
  
  await handleInteractiveChat('hello', state, session);
  console.log = oldLog;
  
  assert.match(logged, /Needle is not configured yet/);
});

test('interactive chat handles missing profile gracefully', async () => {
  const state: ShellState = {
    cwd: process.cwd(),
    config: {
      defaultProvider: '9router',
      models: {},
      providers: {
        '9router': { baseUrl: 'url', apiKeyEnv: 'KEY' }
      },
      tools: {
        allowList: [],
        denyList: [],
        approval: { policy: 'require-all' }
      }
    }
  };
  const session = new ChatSession();
  
  const oldLog = console.log;
  let logged = '';
  console.log = (msg) => { logged += msg + '\n'; };
  
  await handleInteractiveChat('hello', state, session);
  console.log = oldLog;
  
  assert.match(logged, /Model profile missing/);
});

test('interactive chat handles missing key gracefully', async () => {
  const state: ShellState = {
    cwd: process.cwd(),
    config: {
      defaultProvider: '9router',
      models: { smart: 'model1' },
      providers: {
        '9router': { baseUrl: 'url', apiKeyEnv: 'TEST_MISSING_KEY' }
      },
      tools: {
        allowList: [],
        denyList: [],
        approval: { policy: 'require-all' }
      }
    }
  };
  const session = new ChatSession();
  
  const oldLog = console.log;
  let logged = '';
  console.log = (msg) => { logged += msg + '\n'; };
  
  await handleInteractiveChat('hello', state, session);
  console.log = oldLog;
  
  assert.match(logged, /Missing API key for 9router/);
  assert.doesNotMatch(logged, /sk-test-key-1234/);
});