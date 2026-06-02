import { Command } from "commander";

export const experimentalCommand = new Command("experimental")
  .alias("v2")
  .description("Launch experimental v2 runtime")
  .action(async () => {
    console.warn("Needle experimental runtime is not release-safe yet.");
    console.warn("Use this only for testing. Stable runtime is available with `needle`.");
    
    try {
      await import("../../../src-v2/tui/run-tui.js");
    } catch (err) {
      console.error("Failed to start Needle v2 TUI:", err);
      process.exit(1);
    }
  });