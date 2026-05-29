import { glob } from "glob";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface GlobInput {
  pattern: string;
  maxResults?: number;
}

const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.needle/cache/**",
  "**/.needle/sessions/**",
];

export const globTool: ToolDefinition<GlobInput> = {
  name: "glob",
  description: "Search for files by glob pattern",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "pattern": "string", "maxResults?": "number" }',
  async execute(input, context) {
    try {
      const maxResults = input.maxResults ?? 100;
      
      const files = await glob(input.pattern, {
        cwd: context.cwd,
        ignore: IGNORED_PATTERNS,
        nodir: true,
      });

      if (files.length === 0) {
        return { ok: true, output: "No matching files found." };
      }

      const truncated = files.length > maxResults;
      const results = truncated ? files.slice(0, maxResults) : files;

      return {
        ok: true,
        output: results.join("\n"),
        metadata: {
          truncated,
          totalResults: files.length,
          returnedResults: results.length,
        },
      };
    } catch (error) {
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};