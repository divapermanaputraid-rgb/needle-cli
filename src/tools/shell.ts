import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition, ToolResult } from "./types.js";
import { classifyCommandRisk } from "../runtime/command-parser/command-risk.js";

const execAsync = promisify(exec);

export interface ShellInput {
  command: string;
  timeoutMs?: number;
  maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_BYTES = 64 * 1024; // 64KB

// Blocked patterns as specified in requirements
const BLOCKED_PATTERNS = [
  /\brm\s+-rf\b/,
  /\bsudo\b/,
  /\bchmod\s+-R\b/,
  /\bchown\s+-R\b/,
  /\bcurl\s+.*\|\s*sh\b/,
  /\bwget\s+.*\|\s*sh\b/,
  /\bgit\s+push\s+--force\b/,
  /\bnpm\s+publish\b/,
  /\bpnpm\s+publish\b/,
  /\bdocker\s+system\s+prune\b/,
  /\.env\b/,
  /\.git\/config\b/,
  /\.ssh\b/,
  /\.npmrc\b/,
  /\.pypirc\b/,
  /\bcredentials\b/,
  /\bprivate_key\b/,
  /\bid_rsa\b/,
  /\bid_ed25519\b/
];

export const shellTool: ToolDefinition<ShellInput> = {
  name: "shell",
  description: "Execute a shell command.",
  riskLevel: "high", // Base registry risk is high
  isReadOnly: false,
  inputSchemaDescription: '{ "command": "string", "timeoutMs?": "number", "maxBytes?": "number" }',
  
  tags: ["shell"],
  permissionRequirement: "ask",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeoutMs: { type: "number" },
      maxBytes: { type: "number" }
    },
    required: ["command"]
  },
  validate(input: ShellInput, _context) {
    if (!input.command || typeof input.command !== "string") {
      return { ok: false, tool: "shell", error: "Error: Missing or invalid command.", output: "Error: Missing or invalid command." };
    }

    const riskAssessment = classifyCommandRisk(input.command);
    if (riskAssessment.risk === "blocked") {
      return { ok: false, tool: "shell", error: `Error: Command blocked by security policy. Reason: ${riskAssessment.reason}`, output: `Error: Command blocked by security policy. Reason: ${riskAssessment.reason}` };
    }

    const cmdStr = input.command;
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(cmdStr)) {
        return { ok: false, tool: "shell", error: `Error: Command blocked by security policy. Matches restricted pattern.`, output: `Error: Command blocked by security policy. Matches restricted pattern.` };
      }
    }
    return null; // OK
  },

  async execute(input: ShellInput, context): Promise<ToolResult> {
    const riskAssessment = classifyCommandRisk(input.command);

    const timeout = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;

    try {
      const { stdout, stderr } = await execAsync(input.command, {
        cwd: context.cwd,
        timeout: timeout,
        maxBuffer: maxBytes,
        windowsHide: true,
      });

      const combinedOutput = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      const isTruncated = Buffer.byteLength(combinedOutput, 'utf8') > maxBytes;
      const finalOutput = isTruncated
          ? Buffer.from(combinedOutput, 'utf8').subarray(0, maxBytes).toString('utf8') + "\n...[truncated]"
          : combinedOutput || "Command completed with no output.";

      return {
        ok: true,
        tool: "shell",
        result: finalOutput,
        output: finalOutput,
        metadata: {
          exitCode: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: false,
          truncated: isTruncated,
          risk: riskAssessment.risk
        }
      };

    } catch (error: any) {
      const stdout = error.stdout?.toString().trim() || "";
      const stderr = error.stderr?.toString().trim() || "";
      const combinedOutput = [stdout, stderr].filter(Boolean).join("\n");

      const isTruncated = Buffer.byteLength(combinedOutput, 'utf8') > maxBytes;
      const finalOutput = isTruncated
          ? Buffer.from(combinedOutput, 'utf8').subarray(0, maxBytes).toString('utf8') + "\n...[truncated]"
          : combinedOutput;

      const isTimeout = error.killed && error.signal === 'SIGTERM';

      let errorMessage = finalOutput;
      if (!finalOutput) {
          errorMessage = isTimeout
            ? `Command timed out after ${timeout}ms`
            : `Command failed with exit code ${error.code ?? 'unknown'}`;
      }

      return {
        ok: false,
        tool: "shell",
        error: errorMessage,
        output: errorMessage,
        metadata: {
          exitCode: error.code ?? 1,
          stdout,
          stderr,
          timedOut: isTimeout,
          truncated: isTruncated,
          risk: riskAssessment.risk
        }
      };
    }
  },
};