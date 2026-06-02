import type { ModelProfile, ChatMessage, ChatResponse } from "../providers/types.js";
import { ToolRegistry, createDefaultToolRegistry } from "../tools/registry.js";
import { buildProjectContext } from "./context-builder.js";
import { buildAgentSystemPrompt, buildAgentUserPrompt } from "./prompt-builder.js";
import { appendSessionRecord, createSessionId, SessionRecord } from "./session.js";
import type { SessionState } from "../ui/interactive/session-state.js";
import type { ToolObservation } from "../ui/interactive/tool-observation-store.js";
import { compactMessages } from "./context-collapse.js";
import { detectRepoConventions } from "../runtime/repo/repo-conventions.js";
import { execSync } from "child_process";

export interface AgentLoopOptions {
  cwd: string;
  task: string;
  history?: ChatMessage[];
  profile?: ModelProfile;
  maxIterations?: number;
  dryRun?: boolean;
  providerChat?: (messages: ChatMessage[]) => Promise<ChatResponse>;
  toolRegistry?: ToolRegistry;
  sessionState?: SessionState;
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
  observations?: ToolObservation[];
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const startTime = Date.now();
  const maxIterations = options.maxIterations ?? 8;
  const isDryRun = options.dryRun ?? false;
  
  const registry = options.toolRegistry ?? createDefaultToolRegistry();
  const sessionState = options.sessionState;

  const ctx = await buildProjectContext({ cwd: options.cwd });
  const repoConventions = detectRepoConventions(options.cwd);
  
  const systemPrompt = buildAgentSystemPrompt({
    task: options.task,
    projectContext: ctx,
    tools: registry.list(),
    repoConventions
  });

  const toolCalls: AgentToolCallRecord[] = [];
  const loopObservations: ToolObservation[] = [];
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

  let messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(options.history || []),
    { role: "user", content: buildAgentUserPrompt(options.task) }
  ];

  const errors: string[] = [];

  while (iterations < maxIterations) {
    iterations++;

    if (!options.providerChat) {
      throw new Error("providerChat implementation missing");
    }

    // Compact messages to fit within context window
    messages = compactMessages(messages, 8000);

    const response = await options.providerChat(messages);
    messages.push({ role: "assistant", content: response.content });
    
    const hasPseudoCommands = /(?:\/code|\/shell|file\.write|```bash|```sh|file\.read|file\.edit)/i.test(response.content);
    let parsedArray: any[] = [];
    try {
      // Find all JSON blocks in the response. Model might mix text and JSON.
      // Refined: Tolerates whitespace and missing 'json' tags after backticks
      const jsonBlocks = response.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/g);
      if (jsonBlocks && jsonBlocks.length > 0) {
        for (const block of jsonBlocks) {
          const raw = block.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
          try {
             parsedArray.push(JSON.parse(raw));
          } catch (e) {
             // Ignore single bad block if others are valid, let LLM loop handle it
             errors.push(`Warning: skipping a malformed JSON block: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } 
      
      // Fallback: try parse entire response if no codeblocks found or parsing blocks failed
      if (parsedArray.length === 0) {
        parsedArray = [JSON.parse(response.content.trim())];
      }
    } catch (err) {
      if (hasPseudoCommands) {
        messages.push({
          role: "user",
          content: "The previous response contained pseudo tool text instead of a valid Needle tool call. Use the structured tool protocol."
        });
        continue;
      }
      const errMsg = "Error: Invalid JSON response.";
      errors.push(errMsg);
      messages.push({
        role: "user",
        content: errMsg + " You must respond ONLY with valid JSON inside \\`\\`\\`json blocks representing your tool calls."
      });
      continue;
    }

    // Process all parsed blocks sequentially
    let didBreak = false;
    for (const parsed of parsedArray) {
      if (parsed.type === "final") {
        const summaryLower = (parsed.summary || "").toLowerCase();
        const claimsSuccess = /created|edited|changed|executed|passed|successfully/i.test(summaryLower);
        const hasSuccessfulTools = toolCalls.some(t => t.ok);
        
        if (claimsSuccess && !hasSuccessfulTools) {
          messages.push({
            role: "user",
            content: "Error: Your summary claims changes or executions, but no successful tool calls were verified. You must execute actual tools before claiming success."
          });
          break;
        }

        success = true;
        finalSummary = parsed.summary || "Task completed.";
        didBreak = true;
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
          
          let ok = result.ok;
          let output = result.output ?? String(result.result ?? result.error ?? "");
          
          // Test Framework Guard for edited/created files
          if (ok && (toolName === 'file.edit' || toolName === 'file.write' || toolName === 'shell')) {
            const forbidden = [];
            if (repoConventions.testFramework === 'node:test') {
               forbidden.push('vitest', 'bun:test');
            }

            if (forbidden.length > 0 && typeof toolInput === 'object' && toolInput) {
              const contentToCheck = (toolInput as any).content || (toolInput as any).command || "";
              const usedForbidden = forbidden.find((f: string) => contentToCheck.includes(f));
              
              if (usedForbidden) {
                 ok = false;
                 output = `Validation failed: Forbidden import or usage of '${usedForbidden}' detected. This repository uses ${repoConventions.testFramework} and ${repoConventions.assertionLibrary}. Please rewrite using the correct framework.`;
              }
            }
          }

          toolCalls.push({ tool: toolName, ok });

          const obsRecord: ToolObservation = {
            toolName,
            input: typeof toolInput === 'object' && toolInput ? toolInput as Record<string, unknown> : {},
            ok,
            output,
            metadata: result.metadata,
            timestamp: Date.now()
          };
          loopObservations.push(obsRecord);
          if (sessionState) {
            sessionState.toolObservations.record(obsRecord);
          }

          let observation = output;
          if (!ok) {
             observation = `Tool failed: ${observation}`;
          }

          messages.push({
            role: "user",
            content: `Observation from ${toolName}:\n${observation}`
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
    
    if (didBreak) {
      if (success) {
        // Run validations
        const needsValidation = toolCalls.some(t => t.tool === 'file.edit' || t.tool === 'file.write');
        if (needsValidation) {
           let validationPassed = true;
           let validationOutput = "";
           
           try {
             if (repoConventions.typecheckCommand) {
                execSync(repoConventions.typecheckCommand, { cwd: options.cwd, stdio: 'pipe' });
             }
             if (repoConventions.testCommand) {
                execSync(repoConventions.testCommand, { cwd: options.cwd, stdio: 'pipe' });
             }
           } catch (err: any) {
             validationPassed = false;
             validationOutput = err.stdout?.toString() || err.stderr?.toString() || String(err);
           }

           if (!validationPassed) {
             success = false;
             didBreak = false;
             messages.push({
               role: "user",
               content: `Validation failed after your changes. Please fix the following errors:\n${validationOutput}`
             });
             continue; // Continue loop to fix the errors
           }
        }
      }
      
      if (success || didBreak) {
        break;
      }
    }
  }

  if (iterations >= maxIterations && !success) {
    success = false;
    if (toolCalls.length === 0) {
      finalSummary = "The coding agent did not execute any tools. No files were changed.";
    } else {
      finalSummary = `Task failed: Reached maximum iterations (${maxIterations}).`;
    }
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
    toolCalls,
    observations: loopObservations
  };
}