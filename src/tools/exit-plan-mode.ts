import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface ExitPlanModeInput {
  planId: string;
  notes: string;
}

export const exitPlanModeTool: ToolDefinition<ExitPlanModeInput> = {
  name: "exit_plan_mode",
  description: "Mark a plan as completed or abandoned after execution.",
  riskLevel: "low",
  isReadOnly: false,
  inputSchemaDescription: `{ "planId": "The plan file name or path", "notes": "Summary of execution outcomes or deviations" }`,
  async execute(input: ExitPlanModeInput, context: ToolContext): Promise<ToolResult> {
    if (!input.planId || !input.notes) {
       return { ok: false, output: "Missing 'planId' or 'notes' in input." };
    }

    try {
      const summaryFile = path.join(context.cwd, ".needle", "plans", "summary.txt");
      await fs.appendFile(summaryFile, `\n--- Plan: ${input.planId} ---\n${input.notes}\n`, "utf-8");
      return { ok: true, output: "Plan closed. Notes appended to summary.txt" };
    } catch (err) {
      return { ok: false, output: `Failed to exit plan mode: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};