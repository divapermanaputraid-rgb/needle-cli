import { Effect } from "effect";
import { drizzle } from "drizzle-orm/better-sqlite3";
import DatabaseConstructor from "better-sqlite3";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export class Database extends Effect.Service<Database>()("@needle/Database", {
  effect: Effect.gen(function* () {
    const sqlite = new DatabaseConstructor(".needle-v2.db");
    const db = drizzle(sqlite, { schema });

    // Simple initialization: Ensure tables exist for Sprint 2
    // In a real app, we'd use drizzle-kit migrations
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    return {
      createSession: (task: string) =>
        Effect.try({
          try: () => {
            const id = randomUUID();
            db.insert(schema.sessions).values({
              id,
              task,
              createdAt: new Date(),
            }).run();
            return id;
          },
          catch: (error) => error as Error,
        }),

      addMessage: (sessionId: string, role: "system" | "user" | "assistant", content: string) =>
        Effect.try({
          try: () => {
            db.insert(schema.messages).values({
              id: randomUUID(),
              sessionId,
              role,
              content,
            }).run();
          },
          catch: (error) => error as Error,
        }),

      getMessages: (sessionId: string) =>
        Effect.try({
          try: () => 
            db.select().from(schema.messages).where(eq(schema.messages.sessionId, sessionId)).all(),
          catch: (error) => error as Error,
        }),
    };
  }),
}) {}
