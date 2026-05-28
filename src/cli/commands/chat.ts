import { Command } from "commander";
import { loadFungiConfig } from "../../config/loader.js";
import { createProviderRouter } from "../../providers/router.js";
import { ModelProfile } from "../../providers/types.js";

export const chatCommand = new Command("chat")
  .description("Send a one-off message to the active fast/smart model")
  .argument("<message>", "The message to send")
  .option("-p, --profile <profile>", "Model profile to use (fast, smart, coder, planner, reviewer)", "fast")
  .action(async (message: string, options) => {
    try {
      const config = await loadFungiConfig(process.cwd());
      const router = createProviderRouter(config);
      
      const profile = options.profile as ModelProfile;
      console.log(`Sending message using profile: ${profile}...`);
      
      const response = await router.chatWithProfile({
        profile,
        messages: [{ role: "user", content: message }],
      });
      
      console.log("\n=== Response ===");
      console.log(response.content);
      
      if (response.usage) {
        console.log(`\n(Usage: ${response.usage.totalTokens || 0} tokens)`);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });