import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInteractiveChat } from '../../../src/ui/interactive/interactive-chat.js';
import { ChatSession } from '../../../src/ui/interactive/chat-session.js';
import type { ShellState } from '../../../src/ui/interactive/shell-state.js';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';

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

test('interactive chat asks confirmation for code intent and does not run if rejected', async () => {
  const state: ShellState = {
    cwd: process.cwd(),
    config: {
      defaultProvider: '9router',
      models: { coder: 'model1' },
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

  class MockReadline extends EventEmitter {
    pause() {}
    resume() {}
    question(query: string, cb: (answer: string) => void) {
      cb('n'); // Reject
    }
  }

  const rl = new MockReadline() as unknown as readline.Interface;

  const oldLog = console.log;
  let logged = '';
  console.log = (msg) => { logged += msg + '\n'; };

  await handleInteractiveChat('buat file test.md', state, session, rl);
  console.log = oldLog;

  assert.doesNotMatch(logged, /Running code workflow/);
});

test('interactive chat asks confirmation for code intent and runs if accepted', async () => {
  const state: ShellState = {
    cwd: process.cwd(),
    config: {
      defaultProvider: '9router',
      models: { coder: 'model1' },
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

  class MockReadline extends EventEmitter {
    pause() {}
    resume() {}
    question(query: string, cb: (answer: string) => void) {
      cb('y'); // Accept
    }
  }

  const rl = new MockReadline() as unknown as readline.Interface;

  const oldLog = console.log;
  let logged = '';
  console.log = (msg) => { logged += msg + '\n'; };

  // mock core agent loop internally, since we don't have api key it will fail anyway, but it SHOULD log "Running coding agent..."
  await handleInteractiveChat('buat file test.md', state, session, rl);
  console.log = oldLog;

  assert.match(logged, /Running coding agent/);
});