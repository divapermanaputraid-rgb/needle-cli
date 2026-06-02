import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import { fileReadTool } from "./file-read.js";
import { globTool } from "./glob.js";
import { grepTool } from "./grep.js";
import { gitDiffTool } from "./git-diff.js";
import { fileWriteTool } from "./file-write.js";
import { fileEditTool } from "./file-edit.js";
import { shellTool } from "./shell.js";
import { dirCreateTool } from "./dir.create.js";
import { dirExistsTool } from "./dir.exists.js";
import { dirListTool } from "./dir.list.js";
import { askUserQuestionTool } from "./ask-user.js";
import { enterPlanModeTool } from "./enter-plan-mode.js";
import { exitPlanModeTool } from "./exit-plan-mode.js";

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute(
    name: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.execute(input, context);
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(fileReadTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(gitDiffTool);
  registry.register(fileWriteTool);
  registry.register(fileEditTool);
  registry.register(shellTool);
  registry.register(dirCreateTool);
  registry.register(dirExistsTool);
  registry.register(dirListTool);
  registry.register(askUserQuestionTool);
  registry.register(enterPlanModeTool);
  registry.register(exitPlanModeTool);
  return registry;
}
