// Needle Logger — Sprint 0
export type LogLevel = "debug" | "info" | "warn" | "error";

const level: LogLevel = (process.env.NEEDLE_LOG_LEVEL as LogLevel) ?? "info";
const order: LogLevel[] = ["debug", "info", "warn", "error"];

function log(l: LogLevel, ...args: unknown[]) {
  if (order.indexOf(l) >= order.indexOf(level)) {
    const prefix = { debug: "🔍", info: "🪡", warn: "⚠️ ", error: "❌" }[l];
    console.log(prefix, ...args);
  }
}

export const logger = {
  debug: (...a: unknown[]) => log("debug", ...a),
  info:  (...a: unknown[]) => log("info",  ...a),
  warn:  (...a: unknown[]) => log("warn",  ...a),
  error: (...a: unknown[]) => log("error", ...a),
};
