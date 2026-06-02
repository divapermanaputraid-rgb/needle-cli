import * as readline from "node:readline";
import { runAgentLoop, AgentLoopResult } from "../../core/agent-loop.js";
import type { ModelProfile } from "../../providers/types.js";
import { ProviderRouter } from "../../providers/router.js";
import { NeedleConfig } from "../../config/schema.js";
import { SessionState } from "./session-state.js";
import fs from "node:fs/promises";
import path from "node:path";
import { TaskIntent } from "./task-normalizer.js";

export interface CodeActionRunnerOptions {
  input: string;
  cwd: string;
  config: NeedleConfig;
  router: ProviderRouter;
  targetProfile: ModelProfile;
  providerId: string;
  rl: readline.Interface;
  sessionState: SessionState;
  intent?: TaskIntent;
}

export async function runCodeAction(options: CodeActionRunnerOptions): Promise<void> {
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
    return;
  }

  // Deterministic shortcuts
  if (intent?.intent === "code_action") {
    if (intent.targetDirectory && !intent.contentGoal) {
       console.log("\nRunning coding agent...");
       console.log(`\nTool Calls:`);
       const targetPath = path.resolve(cwd, intent.targetDirectory);
       let ok = false;
       try {
         await fs.mkdir(targetPath, { recursive: true });
         ok = true;
         sessionState.toolObservations.record({
           toolName: "dir.create",
           input: { path: intent.targetDirectory },
           ok: true,
           output: `Successfully created directory ${intent.targetDirectory}`,
           metadata: { path: intent.targetDirectory, created: true }
         });
         console.log(`- dir.create {"path":"${intent.targetDirectory}"} ${green}OK${reset}`);
       } catch (e: any) {
         sessionState.toolObservations.record({
           toolName: "dir.create",
           input: { path: intent.targetDirectory },
           ok: false,
           output: `Error: ${e.message}`
         });
         console.log(`- dir.create {"path":"${intent.targetDirectory}"} ${red}FAILED${reset}`);
       }

       console.log(`\nVerification:`);
       const exists = await dirExists(targetPath);
       const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
       console.log(`- ${intent.targetDirectory} exists ${status}`);
       
       if (exists) {
         sessionState.toolObservations.record({
            toolName: "dir.exists",
            input: { path: intent.targetDirectory },
            ok: true,
            output: "true",
            metadata: { exists: true }
         });
         console.log(`- dir.exists {"path":"${intent.targetDirectory}"} ${green}OK${reset}`);
       }

       console.log(`\nDone:\nCreated directory ${intent.targetDirectory}.`);
       return;
    } else if (intent.targetPath && intent.contentGoal) {
       console.log("\nRunning coding agent...");
       console.log(`\nTool Calls:`);
       const targetPath = path.resolve(cwd, intent.targetPath);
       
       // Ensure directory exists
       await fs.mkdir(path.dirname(targetPath), { recursive: true });

       let ok = false;
       try {
         await fs.writeFile(targetPath, intent.contentGoal, "utf-8");
         ok = true;
         sessionState.toolObservations.record({
           toolName: "file.write",
           input: { path: intent.targetPath, content: intent.contentGoal },
           ok: true,
           output: `Successfully wrote file ${intent.targetPath}`,
           metadata: { path: intent.targetPath, created: true }
         });
         console.log(`- file.write {"path":"${intent.targetPath}"} ${green}OK${reset}`);
       } catch (e: any) {
         sessionState.toolObservations.record({
           toolName: "file.write",
           input: { path: intent.targetPath, content: intent.contentGoal },
           ok: false,
           output: `Error: ${e.message}`
         });
         console.log(`- file.write {"path":"${intent.targetPath}"} ${red}FAILED${reset}`);
       }

       console.log(`\nVerification:`);
       const exists = await fileExists(targetPath);
       const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
       console.log(`- ${intent.targetPath} exists ${status}`);
       
       console.log(`\nDone:\nCreated file ${intent.targetPath}.`);
       return;
    }
  }


  console.log("\nRunning coding agent...");
  try {
    const codeProfile: ModelProfile = config.models.coder ? "coder" : targetProfile;

    const result = await runAgentLoop({
      cwd,
      task: input,
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
         }
         if (obs.toolName === 'dir.create' && obs.ok && obs.metadata?.path) {
           const p = path.resolve(cwd, obs.metadata.path as string);
           const exists = await dirExists(p);
           const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
           console.log(`- ${obs.metadata.path} exists ${status}`);
         }
      }
      console.log(`\nDone:\n${result.summary}`);
    } else {
      console.log("- None");
      console.log(`\nDone:\nThe coding agent did not execute any tools. No files were changed.`);
    }

  } catch (err: any) {
    console.log(`\n${red}Code Workflow Error: ${err.message}${reset}`);
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