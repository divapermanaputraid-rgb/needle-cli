import { Command } from 'commander';
import { loadNeedleConfig } from '../../config/loader';
import { createProviderRouter } from '../../providers/router';

export const modelsCommand = new Command('models')
  .description('List available providers and configured model profiles')
  .action(async () => {
    try {
      const config = await loadNeedleConfig(process.cwd());
      const router = createProviderRouter(config);

      console.log('Available Providers:');
      const providers = router.listProviders();
      
      const mergedProviders = { 
        ...require('../../config/schema').DEFAULT_PROVIDER_CONFIGS, 
        ...(config.providers ?? {}) 
      };

      providers.forEach(p => {
        const isDefault = p.id === config.defaultProvider;
        const pConfig = mergedProviders[p.id];
        const apiKeyEnv = pConfig?.apiKeyEnv || '';
        const baseUrl = pConfig?.baseUrl || '';
        const isApiKeySet = process.env[apiKeyEnv] ? 'set' : 'missing';
        const baseUrlStatus = baseUrl ? `baseUrl: ${baseUrl}` : 'baseUrl: default/none';
        
        console.log(`  - ${p.displayName} (${p.id})${isDefault ? ' [DEFAULT]' : ''}`);
        console.log(`      ${baseUrlStatus}`);
        console.log(`      ${apiKeyEnv}: ${isApiKeySet}`);
      });

      console.log('\nConfigured Model Profiles:');
      const profiles = router.listModelProfiles();
      profiles.forEach(p => {
        console.log(`  - ${p.profile}: ${p.model || 'Not set'}`);
      });
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });