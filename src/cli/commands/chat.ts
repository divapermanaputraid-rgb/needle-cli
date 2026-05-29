import { Command } from 'commander';
import { loadNeedleConfig } from '../../config/loader';
import { createProviderRouter } from '../../providers/router';
import type { ModelProfile, ProviderId } from '../../providers/types';

export const chatCommand = new Command('chat')
  .description('Start a chat session or send a single prompt')
  .argument('[prompt]', 'The prompt to send to the model')
  .option('-p, --profile <profile>', 'Model profile to use', 'fast')
  .option('--provider <provider>', 'Override default provider')
  .action(async (prompt: string | undefined, options) => {
    try {
      const config = await loadNeedleConfig(process.cwd());
      const router = createProviderRouter(config);

      const profile = options.profile as ModelProfile;
      const providerId = options.provider as ProviderId | undefined;

      if (prompt) {
        // Single prompt mode
        console.log('Thinking...');
        const response = await router.chatWithProfile({
          profile,
          providerId,
          messages: [{ role: 'user', content: prompt }]
        });
        
        console.log('\nResponse:');
        console.log(response.content);
        if (response.usage) {
          console.log(`\n[Usage: In ${response.usage.inputTokens} | Out ${response.usage.outputTokens} | Total ${response.usage.totalTokens}]`);
        }
      } else {
        // Interactive mode (stub for now, just print a message)
        console.log('Interactive chat mode is coming in a future sprint.');
        console.log('For now, use: needle chat "your prompt here"');
      }
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });