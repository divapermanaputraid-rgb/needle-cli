import { Effect, Layer } from "effect";
import { Logger } from "./core/logger.js";
import { ConfigProvider } from "./core/config.js";
import { FileSystem } from "./core/filesystem.js";

// Main program using the services
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  const config = yield* ConfigProvider;
  
  yield* logger.log("Needle v2 Effect Runtime Initialized");
  yield* logger.log(`Working directory: ${config.cwd}`);
});

// Setup the Live Layer providing all core services
const MainLive = Layer.mergeAll(
  Logger.Default,
  ConfigProvider.Default,
  FileSystem.Default
);

// Execute the program
Effect.runPromise(Effect.provide(program, MainLive)).catch((error) => {
  console.error("Initialization Failed:", error);
  process.exit(1);
});
