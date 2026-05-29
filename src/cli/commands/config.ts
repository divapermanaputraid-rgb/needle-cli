import { Command } from 'commander';
import { loadNeedleConfig, saveNeedleConfig } from '../../config/loader';
import { DEFAULT_PROVIDER_CONFIGS } from '../../config/schema';
import type { ModelProfile } from '../../providers/types';

export const configCommand = new Command('config')
  .description('Manage Needle configuration')
  .action(() => {
    configCommand.help();
  });

configCommand
  .command('get')
  .description('View current configuration')
  .action(async () => {
    try {
      const config = await loadNeedleConfig(process.cwd());
      console.log(JSON.stringify(config, null, 2));
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });

configCommand
  .command('set <key> <value>')
  .description('Set a configuration value (e.g., provider, model.<profile>)')
  .action(async (key: string, value: string) => {
    try {
      const config = await loadNeedleConfig(process.cwd());

      if (key === 'provider') {
        const mergedProviders = { ...DEFAULT_PROVIDER_CONFIGS, ...(config.providers ?? {}) };
        if (!mergedProviders[value]) {
          console.error(`Error: Unknown provider '${value}'.`);
          process.exit(1);
        }
        config.defaultProvider = value;
      } else if (key.startsWith('model.')) {
        const profile = key.split('.')[1] as ModelProfile;
        const validProfiles: ModelProfile[] = ['fast', 'smart', 'coder', 'planner', 'reviewer'];
        if (!validProfiles.includes(profile)) {
          console.error(`Error: Unknown model profile '${profile}'. Valid profiles are: ${validProfiles.join(', ')}`);
          process.exit(1);
        }
        config.models[profile] = value;
      } else if (key.startsWith('providers.')) {
        const parts = key.split('.');
        if (parts.length !== 3 || parts[2] !== 'baseUrl') {
          console.error(`Error: Unsupported provider config key '${key}'. Expected format: providers.<provider>.baseUrl`);
          process.exit(1);
        }
        const providerId = parts[1];
        const mergedProviders = { ...DEFAULT_PROVIDER_CONFIGS, ...(config.providers ?? {}) };
        if (!mergedProviders[providerId]) {
          console.error(`Error: Unknown provider '${providerId}'.`);
          process.exit(1);
        }
        if (!config.providers) {
          config.providers = {};
        }
        if (!config.providers[providerId]) {
          config.providers[providerId] = { ...DEFAULT_PROVIDER_CONFIGS[providerId] };
        }
        config.providers[providerId].baseUrl = value;
      } else {
        console.error(`Error: Unsupported config key '${key}'. Supported keys are 'provider', 'providers.<provider>.baseUrl', and 'model.<profile>'.`);
        process.exit(1);
      }

      await saveNeedleConfig(process.cwd(), config);
      console.log(`Successfully set ${key} to ${value}`);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });