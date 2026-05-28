// FungiCode Permission Policy — Sprint 0
import type { PermissionMode } from "../config/schema.js";
import type { RiskLevel } from "../tools/types.js";

export interface PermissionPolicy {
  mode: PermissionMode;
  canAutoApprove(risk: RiskLevel): boolean;
}

export function createPolicy(mode: PermissionMode): PermissionPolicy {
  return {
    mode,
    canAutoApprove(risk: RiskLevel): boolean {
      if (mode === "yolo") return true;
      if (mode === "auto-low-risk") return risk === "low";
      return false; // "ask" — always prompt
    },
  };
}
