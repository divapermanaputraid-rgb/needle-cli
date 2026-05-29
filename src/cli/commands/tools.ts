import { Command } from "commander";
import { createDefaultToolRegistry } from "../../tools/registry.js";
import { ToolContext } from "../../tools/types.js";
import { loadNeedleConfig } from "../../config/loader.js";
import { createPolicy } from "../../permissions/policy.js";
import { classifyRisk } from "../../permissions/risk-classifier.js";
import { promptApproval } from "../../permissions/approval-prompt.js";

export const toolsCommand = new Command("tools")
  .description("Manage and execute Needle tools");

toolsCommand
  .command("list")
  .description("List available tools")
  .action(() => {
    const registry = createDefaultToolRegistry();
    const tools = registry.list();
    
    console.log("Available Tools:");
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
      console.log(`  Risk: ${tool.riskLevel}, Read-only: ${tool.isReadOnly}`);
      console.log(`  Input schema: ${tool.inputSchemaDescription}`);
    }
  });

toolsCommand
  .command("run <name> [input]")
  .description("Run a tool with optional JSON input")
  .action(async (name: string, inputString?: string) => {
    const registry = createDefaultToolRegistry();
    
    let input: unknown = {};
    if (inputString) {
      try {
        input = JSON.parse(inputString);
      } catch (e) {
        console.error("Error: Input must be valid JSON.");
        process.exit(1);
      }
    }

    const context: ToolContext = {
      cwd: process.cwd(),
    };

    try {
      const tool = registry.get(name);
      if (!tool) {
        console.error(`Tool '${name}' not found.`);
        process.exit(1);
      }

      if (tool.validate) {
        const validationResult = tool.validate(input, context);
        if (validationResult) {
          console.error("Tool execution blocked:");
          console.error(validationResult.output);
          process.exit(1);
        }
      }

      const config = await loadNeedleConfig(process.cwd());
      const policy = createPolicy(config.permissions.mode);
      
      const risk = classifyRisk(name, input);
      
      let isApproved = false;
      if (policy.canAutoApprove(risk)) {
        isApproved = true;
      } else {
         const desc = `Run tool '${name}' (${risk} risk) ${tool.isReadOnly ? '(read-only)' : '(modifies system)'}\nInput: ${JSON.stringify(input, null, 2)}`;
         isApproved = await promptApproval(desc);
      }

      if (!isApproved) {
        console.error("Tool execution aborted by user.");
        process.exit(1);
      }

      const result = await registry.execute(name, input, context);
      
      if (!result.ok) {
        console.error("Tool execution failed:");
        console.error(result.output);
        process.exit(1);
      }

      console.log(result.output);
      if (result.metadata) {
        console.log("\nMetadata:", JSON.stringify(result.metadata, null, 2));
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });