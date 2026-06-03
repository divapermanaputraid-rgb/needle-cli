import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export type SessionMode = "plan" | "code" | "review";

export type SessionStatus = "success" | "failure";

export interface SessionToolCallRecord {
  tool: string;
  ok: boolean;
  riskLevel?: string;
  durationMs?: number;
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  mode: SessionMode;
  task: string;
  cwd: string;
  profile?: string;
  providerId?: string;
  status: SessionStatus;
  durationMs: number;
  summary: string;
  toolCalls?: SessionToolCallRecord[];
  errors?: string[];
  artifacts?: string[];
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export function redactSessionText(input: string, maxBytes: number = 8192, cwd?: string): string {
  if (!input) return input;

  // Redact secrets
  let redacted = input;
  // Common patterns for tokens/keys
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer ***");
  redacted = redacted.replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-***");
  redacted = redacted.replace(/(api[_\-]?key)["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi, "$1: ***");
  redacted = redacted.replace(/([a-zA-Z0-9_-]*(?:SECRET|TOKEN|KEY)[a-zA-Z0-9_-]*)["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi, "$1: ***");

  const dynamicSecrets: string[] = [];

  // Dynamic secret redaction (from env)
  for (const [k, v] of Object.entries(process.env)) {
    if (v && v.length > 5 && /(API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/i.test(k)) {
      dynamicSecrets.push(v);
    }
  }

  // Dynamic secret redaction (from secrets.local.json)
  if (cwd) {
    try {
      const secretsPath = path.join(cwd, ".needle", "secrets.local.json");
      if (fsSync.existsSync(secretsPath)) {
        const content = fsSync.readFileSync(secretsPath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
          for (const val of Object.values(parsed)) {
            if (typeof val === "string" && val.length > 5) {
              dynamicSecrets.push(val);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  for (const secretVal of dynamicSecrets) {
    // Escape string for regex
    const escaped = secretVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    redacted = redacted.replace(new RegExp(escaped, 'g'), "***");
  }

  // Truncate if too long (rough byte approximation using string length is usually fine for this, 
  // but let's use Buffer.from if we really need byte length, or just string slice for safety and speed)
  const buf = Buffer.from(redacted, "utf-8");
  if (buf.length > maxBytes) {
    // Truncate at char level to avoid cutting in the middle of a multi-byte char
    const truncatedStr = buf.subarray(0, maxBytes).toString("utf-8");
    // Ensure we don't have a partial replacement character at the end
    return truncatedStr.replace(/\uFFFD$/, "") + "... (truncated)";
  }

  return redacted;
}

export async function appendSessionRecord(
  cwd: string,
  record: SessionRecord
): Promise<{ ok: boolean; warning?: string }> {
  try {
    const needleDir = path.join(cwd, ".needle");
    const sessionsDir = path.join(needleDir, "sessions");
    const filePath = path.join(sessionsDir, "runs.jsonl");

    // Enforce bounds before writing
    const safeRecord: SessionRecord = {
      ...record,
      summary: redactSessionText(record.summary, 8192, cwd),
      errors: record.errors?.map(e => redactSessionText(e, 4096, cwd)),
    };

    try {
      await fs.mkdir(sessionsDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    
    // Ensure the directory is writable, just in case
    try {
      await fs.access(sessionsDir, fs.constants.W_OK);
    } catch (err) {
      throw new Error(`Directory ${sessionsDir} is not writable: ${err}`);
    }

    try {
      await fs.appendFile(filePath, JSON.stringify(safeRecord) + "\n", { encoding: "utf-8", mode: 0o600 });
    } catch (err: any) {
      // In tests and some environments, directory could become unwritable right after access check
      throw new Error(`Failed to append to ${filePath}: ${err.message}`);
    }
    
    return { ok: true };
  } catch (error) {
    // Logging must never break main command
    const warning = "Could not write session log. Continuing without session persistence.";
    if (process.env["NEEDLE_DEBUG"]) {
      // Only log stack trace if debug is explicitly enabled
      // The calling code (e.g. RuntimeController) is responsible for logging the user-visible warning
      console.warn(`[DEBUG] Session logging failed:`, error);
    }
    return { ok: false, warning };
  }
}

export async function readRecentSessions(
  cwd: string,
  limit: number = 20
): Promise<SessionRecord[]> {
  try {
    const filePath = path.join(cwd, ".needle", "sessions", "runs.jsonl");
    const content = await fs.readFile(filePath, "utf-8");
    
    const lines = content.split("\n").filter(line => line.trim().length > 0);
    const records: SessionRecord[] = [];

    // Parse from end (newest first)
    for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
      try {
        const record = JSON.parse(lines[i]) as SessionRecord;
        if (record && typeof record === "object" && record.id) {
          records.push(record);
        }
      } catch (err) {
        // ignore malformed lines
      }
    }

    return records;
  } catch (error) {
    // File might not exist
    return [];
  }
}

export async function findSessionById(
  cwd: string,
  idOrPrefix: string
): Promise<{
  match?: SessionRecord;
  matches: SessionRecord[];
}> {
  try {
    const filePath = path.join(cwd, ".needle", "sessions", "runs.jsonl");
    const content = await fs.readFile(filePath, "utf-8");

    const lines = content.split("\n").filter(line => line.trim().length > 0);
    const matches: SessionRecord[] = [];
    let exactMatch: SessionRecord | undefined;

    // Parse from end (newest first)
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const record = JSON.parse(lines[i]) as SessionRecord;
        if (record && typeof record === "object" && record.id) {
          if (record.id === idOrPrefix && !exactMatch) {
            exactMatch = record;
          }
          if (record.id.startsWith(idOrPrefix)) {
            matches.push(record);
          }
        }
      } catch (err) {
        // ignore malformed lines
      }
    }

    if (exactMatch) {
      return { match: exactMatch, matches };
    }

    if (matches.length === 1) {
      return { match: matches[0], matches };
    }

    return { matches };
  } catch (error) {
    // File might not exist
    return { matches: [] };
  }
}
