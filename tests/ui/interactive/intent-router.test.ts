import test from 'node:test';
import assert from 'node:assert/strict';
import { routeIntent } from '../../../src/ui/interactive/intent-router.js';

test('intent routing - plan', () => {
  assert.equal(routeIntent('bikin plan fitur login'), 'plan');
  assert.equal(routeIntent('buat step by step'), 'plan');
  assert.equal(routeIntent('planning architecture'), 'plan');
  assert.equal(routeIntent('tolong rencana fitur ini'), 'plan');
});

test('intent routing - code', () => {
  assert.equal(routeIntent('buat file test.md'), 'code');
  assert.equal(routeIntent('fix error ini'), 'code');
  assert.equal(routeIntent('edit file config.ts'), 'code');
  assert.equal(routeIntent('tolong refactor code ini'), 'code');
  assert.equal(routeIntent('run command npm install'), 'code');
  assert.equal(routeIntent('delete file x'), 'code');
});

test('intent routing - chat', () => {
  assert.equal(routeIntent('jelasin project ini'), 'chat');
  assert.equal(routeIntent('review this code'), 'chat');
  assert.equal(routeIntent('cek perubahan ini'), 'chat');
  assert.equal(routeIntent('what does this do?'), 'chat');
  assert.equal(routeIntent('brainstorming ideas'), 'chat');
});