import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ProviderRouter, createProviderRouter } from '../../src/providers/router.js';
import { NeedleConfigSchema, DEFAULT_PROVIDER_CONFIGS } from '../../src/config/schema.js';

describe('Provider Router', () => {
  test('9router and openrouter are separate providers', () => {
    const config = NeedleConfigSchema.parse({});
    const router = createProviderRouter(config);
    
    const nineRouter = router.getProvider('9router');
    const openRouter = router.getProvider('openrouter');
    
    assert.strictEqual(nineRouter.id, '9router');
    assert.strictEqual(nineRouter.displayName, '9Router');
    assert.strictEqual(openRouter.id, 'openrouter');
    assert.strictEqual(openRouter.displayName, 'OpenRouter');
    
    assert.notStrictEqual(nineRouter.id, openRouter.id);
  });
  
  test('9router uses NINE_ROUTER_API_KEY and openrouter uses OPENROUTER_API_KEY', () => {
    const nineConfig = DEFAULT_PROVIDER_CONFIGS['9router'];
    const openConfig = DEFAULT_PROVIDER_CONFIGS['openrouter'];
    
    assert.strictEqual(nineConfig.apiKeyEnv, 'NINE_ROUTER_API_KEY');
    assert.strictEqual(openConfig.apiKeyEnv, 'OPENROUTER_API_KEY');
  });

  test('openrouter uses https://openrouter.ai/api/v1', () => {
    const openConfig = DEFAULT_PROVIDER_CONFIGS['openrouter'];
    
    assert.strictEqual(openConfig.baseUrl, 'https://openrouter.ai/api/v1');
  });

  test('missing 9router baseUrl error is clean', async () => {
    const config = NeedleConfigSchema.parse({
        defaultProvider: '9router',
        models: { coder: 'test-model' }
    });
    
    const router = createProviderRouter(config);
    const originalEnv = process.env.NINE_ROUTER_API_KEY;
    process.env.NINE_ROUTER_API_KEY = 'test-key';
    
    try {
        await router.chatWithProfile({
            profile: 'coder',
            messages: [{ role: 'user', content: 'hello' }],
            providerId: '9router',
            dryRun: false
        });
        assert.fail('Should have thrown an error');
    } catch (err: any) {
        assert.ok(err.message.includes('Missing 9Router base URL'));
        assert.ok(err.message.includes('needle config set providers.9router.baseUrl <url>'));
    } finally {
        if (originalEnv === undefined) {
            delete process.env.NINE_ROUTER_API_KEY;
        } else {
            process.env.NINE_ROUTER_API_KEY = originalEnv;
        }
    }
  });

  test('dry-run does not call provider or require API key', async () => {
    const config = NeedleConfigSchema.parse({
        defaultProvider: '9router',
        models: { coder: 'test-model' }
    });
    const router = createProviderRouter(config);
    
    const originalNineKey = process.env.NINE_ROUTER_API_KEY;
    delete process.env.NINE_ROUTER_API_KEY;

    try {
        const response = await router.chatWithProfile({
            profile: 'coder',
            messages: [{ role: 'user', content: 'test dry run' }],
            providerId: '9router',
            dryRun: true
        });

        assert.strictEqual(response.model, 'test-model');
        assert.strictEqual(response.provider, '9router');
        
        const parsedContent = JSON.parse(response.content);
        assert.strictEqual(parsedContent.type, 'final');
        assert.ok(parsedContent.summary.includes('Dry run'));
    } finally {
        if (originalNineKey !== undefined) {
            process.env.NINE_ROUTER_API_KEY = originalNineKey;
        }
    }
  });
});