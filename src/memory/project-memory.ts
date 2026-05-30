import * as fs from "node:fs/promises";
import * as path from "node:path";
import { redactSessionText } from "../core/session.js";
import * as os from "node:os";

// 3. Privacy polish - absolute paths sanitized
export function sanitizePaths(text: string): string {
  if (!text) return text;
  
  const homeDir = os.homedir();
  if (!homeDir) return text;
  
  // Replace absolute home path with ~
  const homeRegex = new RegExp(homeDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  let result = text.replace(homeRegex, '~');

  // Specific workspace path redaction if needed, though home regex usually catches it
  const workspaceRegex = /\/Users\/[^/]+\/workspace\/[^/]+\/[^/]+/g;
  result = result.replace(workspaceRegex, 'project root');

  return result;
}

export interface ProjectMemory {
  projectSummary: string[];
  architectureNotes: string[];
  commands: string[];
  conventions: string[];
  decisions: string[];
  recurringIssues: string[];
  todo: string[];
  lastReflected?: string;
}

export function createEmptyProjectMemory(): ProjectMemory {
  return {
    projectSummary: [],
    architectureNotes: [],
    commands: [],
    conventions: [],
    decisions: [],
    recurringIssues: [],
    todo: [],
  };
}

export function parseProjectMemory(markdown: string): ProjectMemory {
  const memory = createEmptyProjectMemory();
  const lines = markdown.split("\n");
  
  let currentSection = "";
  
  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentSection = line.substring(3).trim();
      continue;
    }
    
    if (currentSection === "Last Reflected") {
      if (line.trim() && !line.startsWith("#")) {
        memory.lastReflected = line.trim();
      }
      continue;
    }
    
    const bulletMatch = line.match(/^[\*\-]\s+(.*)/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      if (!content) continue;
      
      switch (currentSection) {
        case "Project Summary":
          memory.projectSummary.push(content);
          break;
        case "Architecture Notes":
          memory.architectureNotes.push(content);
          break;
        case "Commands":
          memory.commands.push(content);
          break;
        case "Conventions":
          memory.conventions.push(content);
          break;
        case "Decisions":
          memory.decisions.push(content);
          break;
        case "Recurring Issues":
          memory.recurringIssues.push(content);
          break;
        case "TODO":
          memory.todo.push(content);
          break;
      }
    }
  }
  
  return memory;
}

export function formatProjectMemory(memory: ProjectMemory): string {
  const parts: string[] = [];
  
  parts.push("# Needle Project Memory\n");
  
  const addSection = (title: string, items: string[]) => {
    parts.push(`## ${title}\n`);
    if (items.length === 0) {
      parts.push("- (none)");
    } else {
      for (const item of items) {
        // Redact defensively just in case
        parts.push(`- ${sanitizePaths(redactSessionText(item))}`);
      }
    }
    parts.push("");
  };
  
  addSection("Project Summary", memory.projectSummary);
  addSection("Architecture Notes", memory.architectureNotes);
  addSection("Commands", memory.commands);
  addSection("Conventions", memory.conventions);
  addSection("Decisions", memory.decisions);
  addSection("Recurring Issues", memory.recurringIssues);
  addSection("TODO", memory.todo);
  
  parts.push("## Last Reflected\n");
  parts.push(memory.lastReflected || new Date().toISOString());
  parts.push("");
  
  return parts.join("\n");
}

export async function readProjectMemory(cwd: string): Promise<ProjectMemory> {
  try {
    const memoryPath = path.join(cwd, ".needle", "MEMORY.md");
    const content = await fs.readFile(memoryPath, "utf-8");
    return parseProjectMemory(content);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return createEmptyProjectMemory();
    }
    throw err;
  }
}

export async function writeProjectMemoryAtomic(
  cwd: string,
  memory: ProjectMemory,
  options?: { force?: boolean }
): Promise<void> {
  const dirPath = path.join(cwd, ".needle");
  const memoryPath = path.join(dirPath, "MEMORY.md");
  const tmpPath = path.join(dirPath, "MEMORY.md.tmp");
  const lockPath = path.join(dirPath, "MEMORY.lock");

  await fs.mkdir(dirPath, { recursive: true });

  if (!options?.force) {
    try {
      await fs.stat(lockPath);
      throw new Error("MEMORY.md is locked. Another reflect process may be running. Use --force to override.");
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  // Write lock
  await fs.writeFile(lockPath, new Date().toISOString(), "utf-8");

  try {
    const content = formatProjectMemory(memory);
    
    // Write tmp file
    await fs.writeFile(tmpPath, content, "utf-8");
    
    // Atomic rename
    await fs.rename(tmpPath, memoryPath);
  } finally {
    // Release lock
    try {
      await fs.unlink(lockPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        // Best effort
      }
    }
  }
}