import * as readline from "node:readline";
import { runAgentLoop, AgentLoopResult } from "../../core/agent-loop.js";
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

export async function runCodeAction(options: CodeActionRunnerOptions): Promise<AgentLoopResult | undefined> {
  const { input, cwd, config, router, targetProfile, providerId, rl, sessionState, intent } = options;
  const yellow = "\x1b[33m";
  const red = "\x1b[31m";
  const green = "\x1b[32m";
  const reset = "\x1b[0m";

  rl.pause();
  
  let confirmMsg = `\n${yellow}This looks like a workspace change:\n"${input}"\n\nRun coding agent? (Y/n) ${reset}`;
  
  if (intent?.intent === "code_action") {
    if (intent.targetDirectory && !intent.contentGoal) {
      confirmMsg = `\n${yellow}Code Action: Create Directory "${intent.targetDirectory}"\nProceed? (Y/n) ${reset}`;
    } else if (intent.targetPath && intent.contentGoal) {
      confirmMsg = `\n${yellow}Code Action: Write File "${intent.targetPath}"\nProceed? (Y/n) ${reset}`;
    }
  } else if (intent?.intent === "write_documentation") {
     // Handled by documentation runner, but just in case
     confirmMsg = `\n${yellow}Documentation Action\nProceed? (Y/n) ${reset}`;
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
      if (failedTarget) {
        finalSummary = `Failed: Could not create ${failedTarget}. ${failedReason}`;
        console.log(`\n${finalSummary}`);
      } else if (createdFileRelative) {
        if (intent?.contentGoal?.toLowerCase().includes("workspace") || input.toLowerCase().includes("workspace")) {
           finalSummary = `Created ${createdFileRelative} with a workspace overview.`;
        } else {
           finalSummary = `Created ${createdFileRelative}.`;
        }
        console.log(`\nDone:\n${finalSummary}`);
      } else if (createdDirRelative) {
        finalSummary = `Created directory ${createdDirRelative}.`;
        console.log(`\nDone:\n${finalSummary}`);
      } else {
        // Fallback cleanup for any deterministic messages from the provider
        finalSummary = parseGeneratedSummary(finalSummary);
        console.log(`\nDone:\n${finalSummary}`);
      }

      result.summary = finalSummary;
    } else {
      console.log("- None");
      console.log(`\nDone:\nThe coding agent did not execute any tools. No files were changed.`);
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