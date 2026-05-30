import type { ModelProfile, ChatMessage, ChatResponse } from "../providers/types.js";
import { ToolRegistry, createDefaultToolRegistry } from "../tools/registry.js";
import { buildProjectContext } from "./context-builder.js";
import { buildAgentSystemPrompt, buildAgentUserPrompt } from "./prompt-builder.js";
import { appendSessionRecord, createSessionId, SessionRecord } from "./session.js";

export interface AgentLoopOptions {
  cwd: string;
  task: string;
  profile?: ModelProfile;
  maxIterations?: number;
  dryRun?: boolean;
  providerChat?: (messages: ChatMessage[]) => Promise<ChatResponse>;
  toolRegistry?: ToolRegistry;
}

export interface AgentToolCallRecord {
  tool: string;
  ok: boolean;
}

export interface AgentLoopResult {
  ok: boolean;
  summary: string;
  iterations: number;
  toolCalls: AgentToolCallRecord[];
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const startTime = Date.now();
  const maxIterations = options.maxIterations ?? 8;
  const isDryRun = options.dryRun ?? false;
  
  const registry = options.toolRegistry ?? createDefaultToolRegistry();
  
  const ctx = await buildProjectContext({ cwd: options.cwd });
  
  const systemPrompt = buildAgentSystemPrompt({
    task: options.task,
    projectContext: ctx,
    tools: registry.list()
  });

  const toolCalls: AgentToolCallRecord[] = [];
  let iterations = 0;
  let finalSummary = "";
  let success = false;

  if (isDryRun) {
    const summary = "Dry run completed. Context and prompt built successfully. Provider execution skipped.";
    const record: SessionRecord = {
      id: createSessionId(),
      createdAt: new Date().toISOString(),
      mode: "code",
      task: options.task,
      cwd: options.cwd,
      profile: typeof options.profile === "string" ? options.profile : undefined,
      status: "success",
      durationMs: Date.now() - startTime,
      summary,
      toolCalls: [],
      errors: []
    };
    await appendSessionRecord(options.cwd, record);

    return {
      ok: true,
      summary,
      iterations: 0,
      toolCalls: []
    };
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildAgentUserPrompt(options.task) }
  ];

  const errors: string[] = [];

  while (iterations < maxIterations) {
    iterations++;

    if (!options.providerChat) {
      throw new Error("providerChat implementation missing");
    }

    const response = await options.providerChat(messages);
    messages.push({ role: "assistant", content: response.content });

    let parsed: any;
    try {
      parsed = JSON.parse(response.content);
    } catch (err) {
      const errMsg = "Error: Invalid JSON response.";
      errors.push(errMsg);
      messages.push({
        role: "user",
        content: errMsg + " You must respond ONLY with valid JSON using the required protocol formats."
      });
      continue;
    }

    if (parsed.type === "final") {
      success = true;
      finalSummary = parsed.summary || "Task completed.";
      break;
    } else if (parsed.type === "tool_call") {
      const toolName = parsed.tool;
      const toolInput = parsed.input;
      
      const toolDef = registry.get(toolName);
      
      if (!toolDef) {
        toolCalls.push({ tool: toolName, ok: false });
        messages.push({
          role: "user",
          content: `Error: Unknown tool '${toolName}'. Available tools are: ${registry.list().map(t => t.name).join(", ")}`
        });
        continue;
      }
      
      try {
        const result = await registry.execute(toolName, toolInput, { cwd: options.cwd });
        toolCalls.push({ tool: toolName, ok: result.ok });
        
        let observation = result.output;
        if (!result.ok) {
           observation = `Tool failed: ${result.output}`;
        }
        
        messages.push({
          role: "user",
          content: `Observation:\n${observation}`
        });
      } catch (err) {
        toolCalls.push({ tool: toolName, ok: false });
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Tool execution error for ${toolName}: ${errMsg}`);
        messages.push({
          role: "user",
          content: `Error executing tool: ${errMsg}`
        });
      }
    } else {
       messages.push({
        role: "user",
        content: "Error: Invalid response type. Must be 'tool_call' or 'final'."
      });
    }
  }

  if (iterations >= maxIterations && !success) {
    success = false;
    finalSummary = `Task failed: Reached maximum iterations (${maxIterations}).`;
  }

  const record: SessionRecord = {
    id: createSessionId(),
    createdAt: new Date().toISOString(),
    mode: "code",
    task: options.task,
    cwd: options.cwd,
    profile: typeof options.profile === "string" ? options.profile : undefined,
    status: success ? "success" : "failure",
    durationMs: Date.now() - startTime,
    summary: finalSummary,
    toolCalls: toolCalls.map(t => ({ tool: t.tool, ok: t.ok })),
    errors: errors.length > 0 ? errors : undefined
  };

  await appendSessionRecord(options.cwd, record);

  return {
    ok: success,
    summary: finalSummary,
    iterations,
    toolCalls
  };
}