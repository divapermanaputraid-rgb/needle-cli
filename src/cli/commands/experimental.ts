import { Command } from "commander";

export const experimentalCommand = new Command("experimental")
  .alias("v2")
  .description("Launch experimental v2 runtime")
  .action(async () => {
    console.warn("Needle experimental runtime is not release-safe yet.");
    console.warn("Use this only for testing. Stable runtime is available with `needle`.");
    
    try {
      await import("../../../src-v2/tui/run-tui.js");
    } catch (err: any) {
      if (err.code === "ERR_MODULE_NOT_FOUND" || err.message.includes("Cannot find module")) {
        console.error("Experimental runtime is not included in this package build.");
      } else {
        console.error("Failed to start Needle v2 TUI:", err);
      }
      process.exit(1);
    }
  });