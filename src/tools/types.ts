export type ToolRiskLevel = "low" | "medium" | "high";
export type RiskLevel = ToolRiskLevel;

export type Tool<Input = unknown> = ToolDefinition<Input>;
export type ToolInput = Record<string, unknown>;

export interface ToolContext {
  cwd: string;
}

export interface ToolResult {
  ok: boolean;
  output: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition<Input = unknown> {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  isReadOnly: boolean;
  inputSchemaDescription: string;
  execute(input: Input, context: ToolContext): Promise<ToolResult>;
}