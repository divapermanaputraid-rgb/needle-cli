import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenAIResponse } from '../../src/providers/openai-parser.js';

describe('parseOpenAIResponse', () => {
  test('parses normal JSON response', () => {
    const json = JSON.stringify({
      choices: [{ message: { content: 'hello world' } }],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 }
    });
    const result = parseOpenAIResponse(json, 'TestProvider', 200);
    assert.strictEqual(result.content, 'hello world');
    assert.deepStrictEqual(result.usage, { inputTokens: 10, outputTokens: 2, totalTokens: 12 });
  });

  test('parses SSE data response with delta.content chunks', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]'
    ].join('\n');
    
    const result = parseOpenAIResponse(sse, 'TestProvider', 200);
    assert.strictEqual(result.content, 'hello world');
  });

  test('parses SSE data response with message.content chunks', () => {
    const sse = [
      'data: {"choices":[{"message":{"content":"foo"}}]}',
      'data: {"choices":[{"message":{"content":" bar"}}]}',
      'data: [DONE]'
    ].join('\n');
    
    const result = parseOpenAIResponse(sse, 'TestProvider', 200);
    assert.strictEqual(result.content, 'foo bar');
  });

  test('handles SSE empty lines gracefully', () => {
    const sse = [
      '\n',
      'data: {"choices":[{"delta":{"content":"foo"}}]}',
      '\n',
      'data: {"choices":[{"delta":{"content":" bar"}}]}',
      '\n',
      'data: [DONE]',
      '\n'
    ].join('\n');
    
    const result = parseOpenAIResponse(sse, 'TestProvider', 200);
    assert.strictEqual(result.content, 'foo bar');
  });

  test('handles provider error payload cleanly (HTTP 400)', () => {
    const json = JSON.stringify({ error: { message: 'Rate limited' } });
    assert.throws(
      () => parseOpenAIResponse(json, 'TestProvider', 400),
      (err: any) => err.message === 'Provider TestProvider request failed: 400 Rate limited'
    );
  });

  test('handles non-JSON error payload cleanly (HTTP 400)', () => {
    assert.throws(
      () => parseOpenAIResponse('Bad Gateway', 'TestProvider', 502),
      (err: any) => err.message === 'Provider TestProvider request failed: 502 Bad Gateway'
    );
  });

  test('handles invalid JSON in HTTP 200 cleanly', () => {
    assert.throws(
      () => parseOpenAIResponse('Unexpected token d', 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider returned an invalid chat response.'
    );
  });

  test('handles missing choices in JSON cleanly', () => {
    const json = JSON.stringify({ model: 'gpt-4' });
    assert.throws(
      () => parseOpenAIResponse(json, 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider returned an invalid chat response: missing choices.'
    );
  });

  test('handles empty choices array in JSON cleanly', () => {
    const json = JSON.stringify({ choices: [] });
    assert.throws(
      () => parseOpenAIResponse(json, 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider returned an empty chat response.'
    );
  });

  test('handles missing content in SSE cleanly', () => {
    const sse = [
      'data: {"choices":[]}',
      'data: [DONE]'
    ].join('\n');
    assert.throws(
      () => parseOpenAIResponse(sse, 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider returned an empty chat response.'
    );
  });

  test('parses usage from SSE chunks', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}',
      'data: {"usage":{"prompt_tokens":5,"completion_tokens":1,"total_tokens":6}}',
      'data: [DONE]'
    ].join('\n');
    
    const result = parseOpenAIResponse(sse, 'TestProvider', 200);
    assert.strictEqual(result.content, 'hi');
    assert.deepStrictEqual(result.usage, { inputTokens: 5, outputTokens: 1, totalTokens: 6 });
  });
  
  test('handles SSE error payload cleanly', () => {
    const sse = [
      'data: {"error":{"message":"Streaming failed"}}'
    ].join('\n');
    
    assert.throws(
      () => parseOpenAIResponse(sse, 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider request failed: 200 Streaming failed'
    );
  });
  
  test('handles invalid SSE JSON cleanly', () => {
     const sse = [
      'data: {"choices":[{"delta":',
      'data: [DONE]'
    ].join('\n');
    assert.throws(
      () => parseOpenAIResponse(sse, 'TestProvider', 200),
      (err: any) => err.message === 'Provider TestProvider returned an invalid chat response.'
    );
  });
});