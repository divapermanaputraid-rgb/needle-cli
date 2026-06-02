import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface EnterPlanModeInput {
  taskDescription: string;
}

export const enterPlanModeTool: ToolDefinition<EnterPlanModeInput> = {
  name: "enter_plan_mode",
  description: "Create a plan file before executing complex code changes. Outputs a plan document and prompts the user to review it.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: `{ "taskDescription": "Detailed markdown plan outlining steps, files to touch, and architecture." }`,
  async execute(input: EnterPlanModeInput, context: ToolContext): Promise<ToolResult> {
    if (!input.taskDescription) {
       return { ok: false, output: "Missing 'taskDescription' in input." };
    }

    const needleDir = path.join(context.cwd, ".needle");
    const plansDir = path.join(needleDir, "plans");
    const planPath = path.join(plansDir, `plan-${Date.now()}.md`);

    try {
      await fs.mkdir(plansDir, { recursive: true });
      await fs.writeFile(planPath, input.taskDescription, "utf-8");
      return { 
        ok: true, 
        output: `Plan written to ${planPath}.\nWAIT! Stop and ask the user to review the plan using ask_user_question tool before proceeding.` 
      };
    } catch (err) {
      return { ok: false, output: `Failed to create plan: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
};