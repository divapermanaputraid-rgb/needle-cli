import { Command } from "commander";

export const experimentalCommand = new Command("experimental")
  .alias("v2")
  .description("Show experimental runtime availability")
  .action(() => {
    console.warn("Needle experimental runtime is not release-safe yet.");
    console.warn("Use this only for testing. Stable runtime is available with `needle`.");
    console.error("Experimental runtime is not included in this package build.");
    process.exitCode = 1;
  });
