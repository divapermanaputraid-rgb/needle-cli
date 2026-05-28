import { Command } from "commander";
import { loadFungiConfig } from "../../config/loader.js";
import { createProviderRouter } from "../../providers/router.js";

export const modelsCommand = new Command("models")
  .description("List available providers and model profiles")
  .action(async () => {
    try {
      const config = await loadFungiConfig(process.cwd());
      const router = createProviderRouter(config);

      console.log("=== Active Configuration ===");
      console.log(`Default Provider: ${config.defaultProvider}`);
      
      console.log("\n=== Configured Providers ===");
      const providers = router.listProviders();
      for (const p of providers) {
        console.log(`- ${p.displayName} (${p.id})`);
      }

      console.log("\n=== Model Profiles ===");
      const profiles = router.listModelProfiles();
      for (const p of profiles) {
        const modelDisplay = p.modelId ? p.modelId : "<unset>";
        console.log(`- ${p.profile.padEnd(10)} : ${modelDisplay}`);
      }

      console.log("\nTo change models:");
      console.log("fungi config set model.<profile> <model-id>");
    } catch (error: any) {
      console.error(error.message);
      process.exit(1);
    }
  });