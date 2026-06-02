import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  task: text("task").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
  content: text("content").notNull(),
});
