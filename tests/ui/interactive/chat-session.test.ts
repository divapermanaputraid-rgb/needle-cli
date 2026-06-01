import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatSession } from '../../../src/ui/interactive/chat-session.js';

test('ChatSession keeps only max turns', () => {
  const session = new ChatSession(10);
  
  for (let i = 0; i < 25; i++) {
    session.addMessage({ role: 'user', content: `msg ${i}` });
  }

  const history = session.getHistory();
  assert.equal(history.length, 20); // 10 turns = 20 messages
  assert.equal(history[0].content, 'msg 5'); // oldest kept
  assert.equal(history[19].content, 'msg 24'); // newest kept
});

test('ChatSession clear works', () => {
  const session = new ChatSession();
  session.addMessage({ role: 'user', content: 'hello' });
  assert.equal(session.getHistory().length, 1);
  
  session.clear();
  assert.equal(session.getHistory().length, 0);
});