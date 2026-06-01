import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadNeedleConfig, resolveProviderConfig } from "../../config/loader.js";
import { NeedleConfig } from "../../config/schema.js";

export const doctorCommand = new Command("doctor")
  .description("Verify local setup, workspace config, providers, models, and safety mode")
  .action(async () => {
    let overallStatus: "OK" | "WARN" | "FAIL" = "OK";
    const nextSteps: string[] = [];

    function updateStatus(status: "OK" | "WARN" | "FAIL") {
      if (status === "FAIL") overallStatus = "FAIL";
      if (status === "WARN" && overallStatus !== "FAIL") overallStatus = "WARN";
    }

    console.log("Needle Doctor");
    console.log("─────────────");

    // 1. Runtime
    console.log("Runtime");
    console.log(`OK Node.js version: ${process.version}`);
    console.log(`OK current working directory: ${process.cwd()}`);
    console.log("");

    // 2. Workspace
    console.log("Workspace");
    const cwd = process.cwd();
    const needleDir = path.join(cwd, ".needle");
    const configPath = path.join(needleDir, "config.json");
    const memoryPath = path.join(needleDir, "MEMORY.md");
    const sessionsPath = path.join(needleDir, "sessions", "runs.jsonl");

    let hasConfig = false;
    if (fs.existsSync(configPath)) {
      console.log(`OK .needle/config.json exists`);
      hasConfig = true;
    } else {
      console.log(`FAIL .needle/config.json missing`);
      updateStatus("FAIL");
      nextSteps.push("needle init");
    }

    if (fs.existsSync(memoryPath)) {
      console.log(`OK .needle/MEMORY.md exists`);
    } else {
      console.log(`WARN .needle/MEMORY.md missing`);
      updateStatus("WARN");
      // needle init is already the fix if config is missing, otherwise it can be created manually or via init
    }

    if (fs.existsSync(sessionsPath)) {
      console.log(`OK .needle/sessions/runs.jsonl exists`);
    } else {
      console.log(`INFO .needle/sessions/runs.jsonl missing`);
    }
    console.log("");

    // Load config if exists
    let config: NeedleConfig | null = null;
    if (hasConfig) {
      try {
        config = await loadNeedleConfig(cwd);
      } catch (e: any) {
        console.log(`FAIL Could not parse config: ${e.message}`);
        updateStatus("FAIL");
      }
    }

    // 3. Provider
    console.log("Provider");
    if (config) {
      const activeProviderId = config.defaultProvider;
      console.log(`INFO active provider: ${activeProviderId}`);
      try {
        const providerConfig = resolveProviderConfig(config);
        
        // Base URL
        if (activeProviderId === "9router") {
          if (!providerConfig.baseUrl) {
            console.log(`FAIL active provider baseUrl status: missing`);
            updateStatus("FAIL");
            nextSteps.push(`needle config set providers.9router.baseUrl <url>`);
          } else {
            console.log(`OK active provider baseUrl status: ${providerConfig.baseUrl}`);
          }
        } else if (activeProviderId === "openrouter") {
          if (providerConfig.baseUrl !== "https://openrouter.ai/api/v1") {
            console.log(`WARN active provider baseUrl status: should be https://openrouter.ai/api/v1 (got ${providerConfig.baseUrl})`);
            updateStatus("WARN");
          } else {
            console.log(`OK active provider baseUrl status: ${providerConfig.baseUrl}`);
          }
        } else if (activeProviderId === "openai-compatible") {
          if (!providerConfig.baseUrl) {
            console.log(`FAIL active provider baseUrl status: missing`);
            updateStatus("FAIL");
            nextSteps.push(`needle config set providers.${activeProviderId}.baseUrl <url>`);
          } else {
             console.log(`OK active provider baseUrl status: ${providerConfig.baseUrl}`);
          }
        } else {
          if (providerConfig.baseUrl) {
             console.log(`INFO active provider baseUrl status: ${providerConfig.baseUrl}`);
          }
        }

        // Env Var
        const envName = providerConfig.apiKeyEnv;
        console.log(`INFO active provider API key env name: ${envName}`);
        if (process.env[envName]) {
          console.log(`OK env var is set`);
        } else {
          console.log(`FAIL env var is missing`);
          updateStatus("FAIL");
          nextSteps.push(`export ${envName}="your_key"`);
        }
      } catch (e: any) {
        console.log(`FAIL ${e.message}`);
        updateStatus("FAIL");
      }
    } else {
      console.log("FAIL Cannot check provider without config");
      updateStatus("FAIL");
    }
    console.log("");

    // 4. Models
    console.log("Models");
    if (config) {
      const profiles = ["fast", "smart", "coder", "planner", "reviewer"] as const;
      for (const profile of profiles) {
        const val = config.models[profile];
        if (val) {
          console.log(`OK ${profile}: configured (${val})`);
        } else {
          console.log(`WARN ${profile}: missing`);
          updateStatus("WARN");
          nextSteps.push(`needle config set model.${profile} <modelId>`);
        }
      }
    } else {
      console.log("FAIL Cannot check models without config");
    }
    console.log("");

    // 5. Project
    console.log("Project");
    if (fs.existsSync(path.join(cwd, ".git"))) {
      console.log(`OK git repo detected`);
    } else {
      console.log(`WARN git repo missing`);
      updateStatus("WARN");
      nextSteps.push("git init");
    }
    
    if (fs.existsSync(path.join(cwd, "package.json"))) {
      if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
        console.log(`OK package manager detected: npm`);
      } else if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
        console.log(`OK package manager detected: yarn`);
      } else if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
        console.log(`OK package manager detected: pnpm`);
      } else if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) {
        console.log(`OK package manager detected: bun`);
      } else {
         console.log(`INFO package manager detected: unknown`);
      }
      
      try {
        const pkgData = fs.readFileSync(path.join(cwd, "package.json"), "utf-8");
        const pkg = JSON.parse(pkgData);
        if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
          console.log(`OK package scripts detected: ${Object.keys(pkg.scripts).join(', ')}`);
        } else {
          console.log(`INFO No package scripts detected`);
        }
      } catch (e) {
        console.log(`WARN Could not parse package.json`);
      }
    } else {
      console.log(`INFO No package.json detected`);
    }
    console.log("");

    // 6. Safety
    console.log("Safety");
    if (config) {
      console.log(`INFO permission mode: ${config.permissions.mode}`);
      console.log(`INFO write/shell tools are permission-gated (subject to mode)`);
    } else {
       console.log("FAIL Cannot check permissions without config");
    }
    console.log("");

    console.log("─────────────");
    console.log(`Overall: ${overallStatus}`);
    
    const uniqueSteps = Array.from(new Set(nextSteps));
    if (uniqueSteps.length > 0) {
      console.log("Next Steps:");
      uniqueSteps.forEach(step => console.log(`- ${step}`));
    }
  });