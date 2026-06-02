import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskNormalizer } from '../../src/ui/interactive/task-normalizer.js';
import { ReferenceResolver } from '../../src/ui/interactive/reference-resolver.js';
import { ToolObservationStore } from '../../src/ui/interactive/tool-observation-store.js';

test('task-normalizer classifies chat', () => {
  const normalizer = new TaskNormalizer();
  const res = normalizer.normalize('jelasin project ini');
  assert.equal(res.intent, 'chat');
});

test('task-normalizer classifies plan', () => {
  const normalizer = new TaskNormalizer();
  const res = normalizer.normalize('bikin plan fitur settings');
  assert.equal(res.intent, 'plan');
});

test('task-normalizer classifies code_action', () => {
  const normalizer = new TaskNormalizer();
  const res = normalizer.normalize('buat folder test-1');
  assert.equal(res.intent, 'code_action');
  assert.equal(res.targetDirectory, 'test-1');

  const res2 = normalizer.normalize('buat file test.md isinya hello');
  assert.equal(res2.intent, 'code_action');
  assert.equal(res2.targetPath, 'test.md');
  assert.equal(res2.contentGoal, 'hello');
});

test('task-normalizer classifies write_documentation', () => {
  const normalizer = new TaskNormalizer();
  const res = normalizer.normalize('coba isi dengan apa aja di dalam workspace ini secara lengkap buat client install docs');
  assert.equal(res.intent, 'write_documentation');
});

test('reference resolver maps "di dalamnya" to lastCreatedDirectory', () => {
  const store = new ToolObservationStore();
  store.record({ toolName: 'dir.create', input: { path: 'test-dir' }, ok: true, output: 'OK', metadata: { path: 'test-dir', created: true } });
  
  const resolver = new ReferenceResolver(store);
  const dir = resolver.resolveTargetDirectory('mana di dalamnya buat file .md dulu dong');
  assert.equal(dir, 'test-dir');
});

test('reference resolver maps "folder tadi" to lastCreatedDirectory', () => {
  const store = new ToolObservationStore();
  store.record({ toolName: 'dir.create', input: { path: 'test-dir' }, ok: true, output: 'OK', metadata: { path: 'test-dir', created: true } });
  
  const resolver = new ReferenceResolver(store);
  const dir = resolver.resolveTargetDirectory('coba di folder tadi');
  assert.equal(dir, 'test-dir');
});

test('reference resolver blocks MANA.md / mana.md style filenames', () => {
  const store = new ToolObservationStore();
  const resolver = new ReferenceResolver(store);
  const file = resolver.resolveTargetFile('mana di dalamnya buat file .md dulu dong');
  assert.notEqual(file, 'mana.md');
  assert.notEqual(file, 'MANA.md');
});

test('observation store answers "mana filenya?" from verified state', () => {
  const store = new ToolObservationStore();
  store.record({ toolName: 'file.write', input: { path: 'test.md' }, ok: true, output: 'OK', metadata: { path: 'test.md', created: true } });
  
  const files = store.getCreatedFiles();
  assert.deepEqual(files, ['test.md']);
  
  const lastFile = store.getLastCreatedFile();
  assert.equal(lastFile, 'test.md');
});

test('observation store does not invent missing files', () => {
  const store = new ToolObservationStore();
  store.record({ toolName: 'file.write', input: { path: 'test.md' }, ok: false, output: 'Failed', metadata: { path: 'test.md', created: false } });
  
  const files = store.getCreatedFiles();
  assert.deepEqual(files, []);
  
  const lastFile = store.getLastCreatedFile();
  assert.equal(lastFile, undefined);
});
