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
      providers.forEach(p => {
        const isDefault = p.id === config.defaultProvider;
        console.log(`  - ${p.displayName} (${p.id})${isDefault ? ' [DEFAULT]' : ''}`);
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