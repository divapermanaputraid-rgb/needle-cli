import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import { ToolDefinition } from "./types.js";

export interface GrepInput {
  query: string;
  include?: string;
  maxResults?: number;
}

const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.needle/cache/**",
  "**/.needle/sessions/**",
];

// Simple heuristic for checking if a file is likely binary
function isLikelyBinary(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export const grepTool: ToolDefinition<GrepInput> = {
  name: "grep",
  description: "Search for text within files",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: '{ "query": "string", "include?": "string", "maxResults?": "number" }',
  async execute(input, context) {
    try {
      const maxResults = input.maxResults ?? 100;
      const includePattern = input.include ?? "**/*";
      
      const files = await glob(includePattern, {
        cwd: context.cwd,
        ignore: IGNORED_PATTERNS,
        nodir: true,
      });

      const results: string[] = [];
      let totalMatches = 0;

      for (const file of files) {
        if (results.length >= maxResults) break;

        const targetPath = path.resolve(context.cwd, file);
        
        try {
          // Read a chunk to check if binary
          const fileHandle = await fs.open(targetPath, "r");
          const buffer = Buffer.alloc(512);
          const { bytesRead } = await fileHandle.read(buffer, 0, 512, 0);
          await fileHandle.close();

          if (bytesRead > 0 && isLikelyBinary(buffer.subarray(0, bytesRead))) {
            continue; // Skip binary files
          }

          const content = await fs.readFile(targetPath, "utf8");
          const lines = content.split("\n");
          
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            
            const line = lines[i];
            if (line.includes(input.query)) {
              totalMatches++;
              // Truncate huge lines
              const displayLine = line.length > 256 ? line.substring(0, 256) + "..." : line;
              results.push(`${file}:${i + 1}:${displayLine}`);
            }
          }
        } catch (e) {
          // Skip files we can't read
          continue;
        }
      }

      if (results.length === 0) {
        return { ok: true, output: "No matches found." };
      }

      const truncated = totalMatches > maxResults;

      return {
        ok: true,
        output: results.join("\n"),
        metadata: {
          truncated,
          totalMatches,
          returnedResults: results.length,
        },
      };
    } catch (error) {
      return { ok: false, output: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};