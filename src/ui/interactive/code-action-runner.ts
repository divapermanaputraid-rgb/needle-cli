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
        console.log(`- ${obs.toolName} ${JSON.stringify(obs.input)} ${status}`);
      }

      console.log(`\nVerification:`);
      for (const obs of result.observations) {
         if (obs.toolName === 'file.write' && obs.ok && obs.metadata?.path) {
           const p = path.resolve(cwd, obs.metadata.path as string);
           const exists = await fileExists(p);
           const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
           console.log(`- ${obs.metadata.path} exists ${status}`);
           
           if (exists && sessionState?.toolObservations) {
             sessionState.toolObservations.updateLastCreatedFile(obs.metadata.path as string);
           }
         }
         if (obs.toolName === 'dir.create' && obs.ok && obs.metadata?.path) {
           const p = path.resolve(cwd, obs.metadata.path as string);
           const exists = await dirExists(p);
           const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
           console.log(`- ${obs.metadata.path} exists ${status}`);
           
           if (exists && sessionState?.toolObservations) {
             sessionState.toolObservations.updateLastCreatedDirectory(obs.metadata.path as string);
           }
         }
      }
      console.log(`\nDone:\n${result.summary}`);
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