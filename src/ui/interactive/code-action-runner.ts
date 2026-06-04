import * as readline from "node:readline";
import { runAgentLoop, AgentLoopResult } from "../../core/agent-loop.js";
import type { ValidationRecord } from "../../core/agent-loop.js";
import type { ModelProfile, ChatMessage } from "../../providers/types.js";
import { ProviderRouter } from "../../providers/router.js";
import { NeedleConfig } from "../../config/schema.js";
import { SessionState } from "./session-state.js";
import fs from "node:fs/promises";
import path from "node:path";
import { TaskIntent } from "./task-normalizer.js";

export interface CodeActionRunnerOptions {
  input: string;
  cwd: string;
  history: ChatMessage[];
  config: NeedleConfig;
  router: ProviderRouter;
  targetProfile: ModelProfile;
  providerId: string;
  rl: readline.Interface;
  sessionState: SessionState;
  intent?: TaskIntent;
}

export function parseGeneratedSummary(summary: string): string {
  // Apply standard typographical fixes to final summaries
  let s = summary
    .replace(/workscapce/g, "workspace")
    .replace(/file explain workspace/gi, "with a workspace overview")
    .replace(/file (.*?) written/gi, "Created $1.")
    .replace(/(?<!file )([^\s]+?) written/gi, "Created $1.")
    .replace(/folder (.*?) made\.?/gi, "Created directory $1.");
    
  // Cleanup extra periods that might result from combining replacements
  s = s.replace(/\.\./g, '.');
  
  return s.replace(/\s+/g, ' ').trim();
}

export function getCodeActionTitle(intent?: TaskIntent): string | undefined {
  if (!intent) return undefined;

  let targetPath = intent.targetPath;
  if (
    targetPath &&
    intent.targetDirectory &&
    !path.isAbsolute(targetPath) &&
    path.dirname(targetPath) === "."
  ) {
    targetPath = path.join(intent.targetDirectory, targetPath);
  }

  if (targetPath) {
    return `Code Action: Write File "${targetPath}"`;
  }
  if (intent.intent === "write_documentation") {
    return "Documentation Action";
  }
  if (intent.targetDirectory) {
    return `Code Action: Create Directory "${intent.targetDirectory}"`;
  }
  return undefined;
}

export function formatValidationEvidence(validationResults: ValidationRecord[]): string {
  if (validationResults.length === 0) return "";

  const failed = validationResults.filter((result) => !result.ok || result.exitCode !== 0);
  if (failed.length > 0) {
    return [
      "Validation failed:",
      ...failed.map((result) => `- ${result.command} FAILED (exit code ${result.exitCode})`),
    ].join("\n");
  }

  return [
    "Validation passed:",
    ...validationResults.map((result) => `- ${result.command} OK`),
  ].join("\n");
}

export function formatActionCompletion(
  ok: boolean,
  summary: string,
  validationResults: ValidationRecord[],
): string {
  const evidence = formatValidationEvidence(validationResults);
  if (!ok) {
    const failure = evidence.startsWith("Validation failed:")
      ? evidence
      : summary;
    return `Failed:\n${failure}`;
  }

  return `Done:\n${summary}${evidence ? `\n\n${evidence}` : ""}`;
}

export async function runCodeAction(options: CodeActionRunnerOptions): Promise<AgentLoopResult | undefined> {
  const { input, cwd, config, router, targetProfile, providerId, rl, sessionState, intent } = options;
  const yellow = "\x1b[33m";
  const red = "\x1b[31m";
  const green = "\x1b[32m";
  const reset = "\x1b[0m";

  rl.pause();
  
  let confirmMsg = `\n${yellow}This looks like a workspace change:\n"${input}"\n\nRun coding agent? (Y/n) ${reset}`;
  
  const actionTitle = getCodeActionTitle(intent);
  if (actionTitle) {
    confirmMsg = `\n${yellow}${actionTitle}\nProceed? (Y/n) ${reset}`;
  }

  const confirm = await new Promise<string>((resolve) => {
    rl.question(confirmMsg, (answer) => {
        resolve(answer);
      }
    );
  });
  rl.resume();

  if (confirm.toLowerCase() !== "y" && confirm !== "") {
    console.log("Cancelled. No files changed.");
    return undefined;
  }

  console.log("\nRunning coding agent...");
  try {
    const codeProfile: ModelProfile = config.models.coder ? "coder" : targetProfile;

    const result = await runAgentLoop({
      cwd,
      task: input,
      history: options.history,
      profile: codeProfile,
      providerChat: async (msgs) =>
        router.chatWithProfile({
          profile: codeProfile,
          messages: msgs,
          providerId: providerId as any,
        }),
      sessionState
    });
    const validationResults = result.validationResults ?? [];

    console.log(`\nTool Calls:`);
    if (result.observations && result.observations.length > 0) {
      for (const obs of result.observations) {
        const status = obs.ok ? `${green}OK${reset}` : `${red}FAILED${reset}`;
        // Mask absolute paths in the JSON string
        const displayInput = { ...obs.input };
        if (typeof displayInput.path === 'string' && path.isAbsolute(displayInput.path)) {
          displayInput.path = path.relative(cwd, displayInput.path);
        }
        console.log(`- ${obs.toolName} ${JSON.stringify(displayInput)} ${status}`);
      }

      console.log(`\nVerification:`);
      
      let createdDirRelative = "";
      let createdFileRelative = "";
      let failedTarget = "";
      let failedReason = "";

      for (const obs of result.observations) {
         if (obs.toolName === 'file.write' && obs.metadata?.path) {
           const p = path.resolve(cwd, obs.metadata.path as string);
           const relPath = path.relative(cwd, p);
           if (obs.ok) {
             const exists = await fileExists(p);
             const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
             console.log(`- ${relPath} exists ${status}`);
             
             if (exists) {
               createdFileRelative = relPath;
               if (sessionState?.toolObservations) {
                 // Store both relative display path and absolute path technically, but UI uses the path stored here
                 sessionState.toolObservations.updateLastCreatedFile(relPath, p);
               }
             }
           } else {
             failedTarget = relPath;
             failedReason = obs.output || "Unknown error";
           }
         }
         if (obs.toolName === 'dir.create' && obs.metadata?.path) {
           const p = path.resolve(cwd, obs.metadata.path as string);
           const relPath = path.relative(cwd, p);
           if (obs.ok) {
             const exists = await dirExists(p);
             const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
             console.log(`- ${relPath} exists ${status}`);
             
             if (exists) {
               createdDirRelative = relPath;
               if (sessionState?.toolObservations) {
                 sessionState.toolObservations.updateLastCreatedDirectory(relPath, p);
               }
             }
           } else {
             failedTarget = relPath;
             failedReason = obs.output || "Unknown error";
           }
         }
      }

      // Generate clean final messages based on tools executed
      let finalSummary = result.summary;
      
      // Override final Summary if validation failure prevents success claim
      if (!result.ok) {
        finalSummary = validationResults.some((validation) => !validation.ok || validation.exitCode !== 0)
          ? "Validation failed. No success claimed."
          : "Task did not complete. No success claimed.";
        console.log(`\n${formatActionCompletion(false, finalSummary, validationResults)}`);
      } else if (failedTarget) {
        finalSummary = `Could not create ${failedTarget}. ${failedReason}`;
        console.log(`\n${formatActionCompletion(false, finalSummary, [])}`);
      } else if (createdFileRelative) {
        if (intent?.contentGoal?.toLowerCase().includes("workspace") || input.toLowerCase().includes("workspace")) {
           finalSummary = `Created ${createdFileRelative} with a workspace overview.`;
        } else {
           finalSummary = `Created ${createdFileRelative}.`;
        }
        console.log(`\n${formatActionCompletion(true, finalSummary, validationResults)}`);
      } else if (createdDirRelative) {
        finalSummary = `Created directory ${createdDirRelative}.`;
        console.log(`\n${formatActionCompletion(true, finalSummary, validationResults)}`);
      } else {
        // Fallback cleanup for any deterministic messages from the provider
        finalSummary = parseGeneratedSummary(finalSummary);
        console.log(`\n${formatActionCompletion(true, finalSummary, validationResults)}`);
      }

      result.summary = finalSummary;
    } else {
      console.log("- None");
      const finalSummary = result.ok
        ? "The coding agent did not execute any tools. No files were changed."
        : "Task did not complete. No files were changed.";
      console.log(`\n${formatActionCompletion(result.ok, finalSummary, validationResults)}`);
      result.summary = finalSummary;
    }

    return result;

  } catch (err: any) {
    console.log(`\n${red}Code Workflow Error: ${err.message}${reset}`);
    return undefined;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
