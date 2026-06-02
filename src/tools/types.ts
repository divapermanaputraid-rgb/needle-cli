export type ToolRiskLevel = "low" | "medium" | "high" | "blocked";
export type RiskLevel = ToolRiskLevel;

export type Tool<Input = any> = ToolDefinition<Input>;
export type ToolInput = Record<string, unknown>;

export interface ToolContext {
  cwd: string;
}

export interface ToolResult {
  ok: boolean;
  tool?: string;
  output?: string;
  result?: unknown;
  error?: string;
  metadata?: {
    paths?: string[];
    risk?: string;
    exitCode?: number;
    [key: string]: any;
  };
}

export interface ToolDefinition<Input = any> {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  tags?: string[];
  permissionRequirement?: string;
  isReadOnly?: boolean;
  inputSchemaDescription?: string;
  inputSchema?: unknown;
  validate?(input: Input, context: ToolContext): ToolResult | null;
  execute(input: Input, context: ToolContext): Promise<ToolResult>;
}
