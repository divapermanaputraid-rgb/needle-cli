import { ToolDefinition, ToolContext, ToolResult } from "./types.js";

interface DelegateTaskInput {
  task: string;
  context: string;
}

export const delegateTaskTool: ToolDefinition<DelegateTaskInput> = {
  name: "delegate_task",
  description: "Spawn a subagent to work on a task in an isolated context. Useful for complex reasoning or research that would bloat the main conversation.",
  riskLevel: "medium",
  isReadOnly: false,
  inputSchemaDescription: `{ "task": "What the subagent should accomplish", "context": "Background info the subagent needs" }`,
  async execute(input: DelegateTaskInput, _context: ToolContext): Promise<ToolResult> {
    if (!input.task) {
      return { ok: false, output: "Missing 'task' in input." };
    }

    return {
      ok: true,
      output: `[MOCK SUBAGENT EXECUTION]\nSubagent spawned for task: "${input.task}".\nResult: The subagent completed the task successfully. (Note: This is a mock implementation for Sprint 4).`
    };
  }
};