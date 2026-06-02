import { ToolRiskLevel } from "../../tools/types.js";

export interface CommandRiskResult {
  risk: ToolRiskLevel | "blocked";
  reason?: string;
}

const LOW_RISK_COMMANDS = ["pwd", "ls", "cat", "grep", "rg", "find", "echo"];
const BLOCKED_COMMANDS = ["rm -rf /", "sudo", "curl", "wget", "chown", "chmod"];

export function classifyCommandRisk(command: string): CommandRiskResult {
  const trimmed = command.trim();
  
  if (!trimmed) {
    return { risk: "low" };
  }

  // Very basic heuristic parser for sprint B
  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0];

  // Block dangerous commands explicitly
  if (trimmed.includes("rm -rf /")) {
    return { risk: "blocked", reason: "Dangerous removal command blocked" };
  }
  
  if (baseCmd === "sudo") {
    return { risk: "blocked", reason: "Sudo is blocked" };
  }

  if ((baseCmd === "curl" || baseCmd === "wget") && trimmed.includes("|") && trimmed.includes("sh")) {
    return { risk: "blocked", reason: "Remote script execution blocked" };
  }

  if (baseCmd === "curl" || baseCmd === "wget" || baseCmd === "chmod" || baseCmd === "chown") {
     return { risk: "high", reason: "Network or permission modification command" };
  }

  if (baseCmd === "npm" || baseCmd === "pnpm" || baseCmd === "yarn" || baseCmd === "bun") {
    if (parts[1] === "install" || parts[1] === "i" || parts[1] === "add") {
       return { risk: "high", reason: "Package installation" };
    }
    return { risk: "medium", reason: "Package manager command" };
  }

  if (LOW_RISK_COMMANDS.includes(baseCmd)) {
    return { risk: "low" };
  }

  // Default to medium for things like mkdir, touch, cp, mv, etc.
  return { risk: "medium" };
}