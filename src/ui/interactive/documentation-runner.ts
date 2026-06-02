import * as readline from "node:readline";
import path from "node:path";
import fs from "node:fs/promises";
import { NeedleConfig } from "../../config/schema.js";
import { ProviderRouter } from "../../providers/router.js";
import { ModelProfile, ChatMessage } from "../../providers/types.js";
import { SessionState } from "./session-state.js";
import { TaskIntent } from "./task-normalizer.js";

export interface DocumentationRunnerOptions {
  input: string;
  cwd: string;
  history: ChatMessage[];
  config: NeedleConfig;
  router: ProviderRouter;
  targetProfile: ModelProfile;
  providerId: string;
  rl: readline.Interface;
  sessionState: SessionState;
  intent: TaskIntent;
}

export async function runDocumentation(options: DocumentationRunnerOptions): Promise<{ summary: string } | undefined> {
  const { input, cwd, config, router, targetProfile, providerId, rl, sessionState, intent } = options;
  const yellow = "\x1b[33m";
  const red = "\x1b[31m";
  const green = "\x1b[32m";
  const reset = "\x1b[0m";

  // 1. Infer target directory and file
  let targetDir = intent.targetDirectory;
  let targetFile = intent.targetPath;

  if (!targetDir && !targetFile) {
     const lastDir = sessionState.toolObservations.getLastCreatedDirectory();
     if (lastDir) {
       targetDir = lastDir;
       targetFile = path.join(targetDir, "README.md");
     } else if (input.toLowerCase().includes("docs")) {
       targetDir = "docs";
       targetFile = "docs/INSTALLATION.md";
     } else {
       console.log("I am not sure where to create the documentation. Please specify a folder or file.");
       return undefined;
     }
  }

  if (targetDir && !targetFile) {
     if (targetDir === "docs" || targetDir === "docs/") {
         targetFile = path.join(targetDir, "INSTALLATION.md");
     } else {
         targetFile = path.join(targetDir, "README.md");
     }
  }

  if (!targetFile) {
     console.log("Could not determine target file.");
     return undefined;
  }

  // 2. Ask confirmation
  rl.pause();
  const confirmMsg = `\n${yellow}Documentation Action: Write to "${targetFile}"\nProceed? (Y/n) ${reset}`;
  const confirm = await new Promise<string>((resolve) => {
    rl.question(confirmMsg, (answer) => {
        resolve(answer);
      }
    );
  });
  rl.resume();

  if (confirm.toLowerCase() !== "y" && confirm !== "") {
    console.log("Cancelled.");
    return undefined;
  }

  console.log("\nRunning documentation task...");
  console.log(`\nTool Calls:`);

  // 3. Inspect project
  let pkgJsonStr = "";
  let readmeStr = "";
  try {
     pkgJsonStr = await fs.readFile(path.resolve(cwd, "package.json"), "utf-8");
     sessionState.toolObservations.record({
       toolName: "file.read",
       input: { path: "package.json" },
       ok: true,
       output: "Read package.json"
     });
     console.log(`- file.read {"path":"package.json"} ${green}OK${reset}`);
  } catch (e) {
     // ignore
  }

  try {
     readmeStr = await fs.readFile(path.resolve(cwd, "README.md"), "utf-8");
     sessionState.toolObservations.record({
       toolName: "file.read",
       input: { path: "README.md" },
       ok: true,
       output: "Read README.md"
     });
     console.log(`- file.read {"path":"README.md"} ${green}OK${reset}`);
  } catch (e) {
     // ignore
  }

  // 4. Generate content
  console.log("Generating content...");
  const prompt = `You are an expert documentation writer.
The user wants to generate documentation.
Target file: ${targetFile}
User request: ${input}

Context:
package.json:
${pkgJsonStr.slice(0, 1000)}

README.md:
${readmeStr.slice(0, 1000)}

Please write meaningful markdown content for the documentation.
Do not wrap it in markdown code blocks (\`\`\`markdown), just output the raw markdown text.
Be detailed and professional.`;

  let content = "";
  try {
    const docProfile: ModelProfile = config.models.coder ? "coder" : targetProfile;
    const response = await router.chatWithProfile({
      profile: docProfile,
      messages: [{ role: "user", content: prompt }],
      providerId: providerId as any,
    });
    content = response.content;
  } catch (e: any) {
    console.log(`${red}Failed to generate documentation: ${e.message}${reset}`);
    return undefined;
  }

  // Strip markdown blocks if they exist
  if (content.startsWith("```markdown")) {
    content = content.replace(/^```markdown\n/, "").replace(/\n```$/, "");
  } else if (content.startsWith("```")) {
    content = content.replace(/^```\w*\n/, "").replace(/\n```$/, "");
  }

  // 5. Write file
  const fullTargetPath = path.resolve(cwd, targetFile);
  try {
    await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });
    await fs.writeFile(fullTargetPath, content, "utf-8");
    sessionState.toolObservations.record({
      toolName: "file.write",
      input: { path: targetFile },
      ok: true,
      output: `Wrote documentation to ${targetFile}`,
      metadata: { path: targetFile, created: true }
    });
    console.log(`- file.write {"path":"${targetFile}"} ${green}OK${reset}`);
  } catch (e: any) {
    sessionState.toolObservations.record({
      toolName: "file.write",
      input: { path: targetFile },
      ok: false,
      output: `Failed to write documentation: ${e.message}`
    });
    console.log(`- file.write {"path":"${targetFile}"} ${red}FAILED${reset}`);
    return undefined;
  }

  // 6. Verify file exists
  console.log(`\nVerification:`);
  let exists = false;
  try {
    const stat = await fs.stat(fullTargetPath);
    exists = stat.isFile();
  } catch (e) {
    exists = false;
  }

  const status = exists ? `${green}OK${reset}` : `${red}FAILED (Missing)${reset}`;
  console.log(`- ${targetFile} exists ${status}`);

  const summary = `Created documentation at ${targetFile}.`;
  console.log(`\nDone:\n${summary}`);
  return { summary };
}