import { Effect, Layer } from "effect";
import { Logger } from "./core/logger.js";
import { ConfigProvider } from "./core/config.js";
import { FileSystem } from "./core/filesystem.js";
import { Database } from "./core/database.js";

// Main program using the services
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  const config = yield* ConfigProvider;
  const db = yield* Database;
  
  yield* logger.log("Needle v2 Effect Runtime Initialized");
  yield* logger.log(`Working directory: ${config.cwd}`);

  // 1. Create a dummy session
  const sessionId = yield* db.createSession("Verify database persistence");
  yield* logger.log(`Created session: ${sessionId}`);

  // 2. Add a system message
  yield* db.addMessage(sessionId, "system", "You are an AI assistant.");
  
  // 3. Add a user message
  yield* db.addMessage(sessionId, "user", "Hello, database!");

  // 4. Query the messages and log the count
  const messages = yield* db.getMessages(sessionId);
  yield* logger.log(`Retrieved ${messages.length} messages from database.`);

  for (const msg of messages) {
    yield* logger.log(`[${msg.role}]: ${msg.content}`);
  }
});

// Setup the Live Layer providing all core services
const MainLive = Layer.mergeAll(
  Logger.Default,
  ConfigProvider.Default,
  FileSystem.Default,
  Database.Default
);

// Execute the program
Effect.runPromise(Effect.provide(program, MainLive)).catch((error) => {
  console.error("Initialization Failed:", error);
  process.exit(1);
});
