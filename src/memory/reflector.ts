import { readRecentSessions, SessionRecord, redactSessionText } from "../core/session.js";
import { 
  ProjectMemory, 
  readProjectMemory, 
  writeProjectMemoryAtomic,
  formatProjectMemory
} from "./project-memory.js";
import * as path from "node:path";
import { buildReflectSystemPrompt, buildReflectUserPrompt } from "../core/prompt-builder.js";
import type { ModelProfile, ChatMessage, ChatResponse } from "../providers/types.js";

export interface ReflectOptions {
  cwd: string;
  limit?: number;
  dryRun?: boolean;
  force?: boolean;
  llm?: boolean;
  profile?: ModelProfile;
  providerChat?: (messages: ChatMessage[]) => Promise<ChatResponse>;
}

export interface ReflectResult {
  ok: boolean;
  dryRun: boolean;
  sessionsRead: number;
  memoryPath: string;
  proposedMemory: string;
  summary: string;
}

function extractSnippets(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  const snippets: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // VERY simplistic extraction for V1 deterministic reflect:
    // Just grab lines that look like useful notes, avoiding obvious raw noise
    if (trimmed.length > 5 && trimmed.length < 150) {
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        snippets.push(trimmed.substring(1).trim());
      } else if (trimmed.includes("decided") || trimmed.includes("agreed") || trimmed.includes("added")) {
        snippets.push(trimmed);
      }
    }
  }
  return snippets;
}

export function buildMemoryFromSessions(
  existing: ProjectMemory,
  sessions: SessionRecord[]
): ProjectMemory {
  // Deep clone existing memory (arrays)
  const nextMemory: ProjectMemory = {
    projectSummary: [...existing.projectSummary],
    architectureNotes: [...existing.architectureNotes],
    commands: [...existing.commands],
    conventions: [...existing.conventions],
    decisions: [...existing.decisions],
    recurringIssues: [...existing.recurringIssues],
    todo: [...existing.todo]
  };

  const addUnique = (arr: string[], item: string, maxItems: number = 30) => {
    const clean = redactSessionText(item).trim();
    if (!clean || clean.length < 5) return;
    if (!arr.includes(clean)) {
      arr.unshift(clean); // add to top
      if (arr.length > maxItems) {
        arr.pop(); // keep within limits
      }
    }
  };

  for (const session of sessions) {
    // Process based on mode
    if (session.mode === "plan") {
      addUnique(nextMemory.todo, `Planned task: ${session.task}`);
      const notes = extractSnippets(session.summary);
      for (const note of notes) {
        if (note.toLowerCase().includes("architect") || note.toLowerCase().includes("design")) {
          addUnique(nextMemory.architectureNotes, note);
        } else if (note.toLowerCase().includes("decid") || note.toLowerCase().includes("will use")) {
          addUnique(nextMemory.decisions, note);
        }
      }
    } else if (session.mode === "code") {
      addUnique(nextMemory.projectSummary, `Implemented: ${session.task}`);
      
      // Look for commands in tool calls
      if (session.toolCalls) {
        for (const tc of session.toolCalls) {
          if (tc.tool === "shell") {
            // Note: we don't have the raw command string in the basic SessionToolCallRecord,
            // but we can note that shell was used. A better approach would parse the command.
            // For now, extract commands from summary if they look like commands.
          }
        }
      }
      
      // Extract from summary
      const notes = extractSnippets(session.summary);
      for (const note of notes) {
        if (note.startsWith("npm ") || note.startsWith("pnpm ") || note.startsWith("yarn ") || note.startsWith("git ")) {
          addUnique(nextMemory.commands, note);
        } else if (note.toLowerCase().includes("convention") || note.toLowerCase().includes("pattern")) {
          addUnique(nextMemory.conventions, note);
        } else if (session.errors && session.errors.length > 0) {
          // If session had errors, maybe this note is about a fix
          addUnique(nextMemory.recurringIssues, `Encountered during ${session.task}: ${note}`);
        }
      }
    } else if (session.mode === "review") {
      const notes = extractSnippets(session.summary);
      for (const note of notes) {
        if (note.toLowerCase().includes("issue") || note.toLowerCase().includes("bug")) {
          addUnique(nextMemory.recurringIssues, note);
        } else if (note.toLowerCase().includes("refactor") || note.toLowerCase().includes("todo")) {
          addUnique(nextMemory.todo, note);
        }
      }
    }
    
    // Always check errors for recurring issues
    if (session.errors) {
      for (const error of session.errors) {
         // only take first line of error to avoid noise
         const firstLine = error.split('\n')[0];
         addUnique(nextMemory.recurringIssues, `Error: ${firstLine}`);
      }
    }
  }

  // Set last reflected
  nextMemory.lastReflected = new Date().toISOString();

  return nextMemory;
}

export async function runReflect(options: ReflectOptions): Promise<ReflectResult> {
  const limit = options.limit || 20;
  
  // Read sessions
  const sessions = await readRecentSessions(options.cwd, limit);
  
  if (sessions.length === 0) {
    return {
      ok: true,
      dryRun: !!options.dryRun,
      sessionsRead: 0,
      memoryPath: path.join(options.cwd, ".needle", "MEMORY.md"),
      proposedMemory: "",
      summary: "No sessions found. Nothing to reflect."
    };
  }

  // Read existing memory
  const existingMemory = await readProjectMemory(options.cwd);

  // Build new memory
  let nextMemory: ProjectMemory;
  let usedLlm = false;

  if (options.llm) {
    if (!options.providerChat) {
      return {
        ok: false,
        dryRun: !!options.dryRun,
        sessionsRead: sessions.length,
        memoryPath: path.join(options.cwd, ".needle", "MEMORY.md"),
        proposedMemory: "",
        summary: "LLM reflection failed: providerChat missing. Ensure API keys/baseUrl are configured."
      };
    }

    try {
      // Redact sessions
      const redactedSessions = sessions.map(s => ({
        ...s,
        summary: redactSessionText(s.summary),
        task: redactSessionText(s.task),
        errors: s.errors?.map(e => redactSessionText(e)),
        toolCalls: s.toolCalls?.map(tc => ({
          ...tc
        }))
      }));

      // Limit overall payload somewhat simply by restricting stringify
      let recentSessionsStr = JSON.stringify(redactedSessions, null, 2);
      if (recentSessionsStr.length > 50000) {
        recentSessionsStr = recentSessionsStr.slice(0, 50000) + "\n...[TRUNCATED]";
      }

      const existingMemoryStr = JSON.stringify(existingMemory, null, 2);

      const sysPrompt = buildReflectSystemPrompt();
      const userPrompt = buildReflectUserPrompt({
        existingMemory: existingMemoryStr,
        recentSessions: recentSessionsStr
      });

      const messages: ChatMessage[] = [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ];

      const res = await options.providerChat(messages);
      
      let content = res.content.trim();
      // Attempt to clean markdown if present (even though forbidden by prompt)
      if (content.startsWith("```json")) {
        content = content.substring(7);
        if (content.endsWith("```")) {
          content = content.substring(0, content.length - 3);
        }
      }

      const parsed = JSON.parse(content);
      
      // Basic validation of shape
      nextMemory = {
        projectSummary: Array.isArray(parsed.projectSummary) ? parsed.projectSummary : existingMemory.projectSummary,
        architectureNotes: Array.isArray(parsed.architectureNotes) ? parsed.architectureNotes : existingMemory.architectureNotes,
        commands: Array.isArray(parsed.commands) ? parsed.commands : existingMemory.commands,
        conventions: Array.isArray(parsed.conventions) ? parsed.conventions : existingMemory.conventions,
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : existingMemory.decisions,
        recurringIssues: Array.isArray(parsed.recurringIssues) ? parsed.recurringIssues : existingMemory.recurringIssues,
        todo: Array.isArray(parsed.todo) ? parsed.todo : existingMemory.todo,
        lastReflected: new Date().toISOString()
      };
      
      // Post-redact all fields just in case the LLM hallucinated secrets
      const safeMemory: ProjectMemory = {
        projectSummary: nextMemory.projectSummary.map(s => redactSessionText(s)),
        architectureNotes: nextMemory.architectureNotes.map(s => redactSessionText(s)),
        commands: nextMemory.commands.map(s => redactSessionText(s)),
        conventions: nextMemory.conventions.map(s => redactSessionText(s)),
        decisions: nextMemory.decisions.map(s => redactSessionText(s)),
        recurringIssues: nextMemory.recurringIssues.map(s => redactSessionText(s)),
        todo: nextMemory.todo.map(s => redactSessionText(s)),
        lastReflected: nextMemory.lastReflected
      };
      
      // 2. Improve LLM reflect dry-run consistency - Empty JSON logic
      // If the LLM returned empty arrays for ALL sections, it means it couldn't glean anything
      // or got confused. We fallback to deterministic so memory doesn't just clear out uselessly.
      const isEmpty = (
        safeMemory.projectSummary.length === 0 &&
        safeMemory.architectureNotes.length === 0 &&
        safeMemory.commands.length === 0 &&
        safeMemory.conventions.length === 0 &&
        safeMemory.decisions.length === 0 &&
        safeMemory.recurringIssues.length === 0 &&
        safeMemory.todo.length === 0
      );

      if (isEmpty) {
        console.warn("LLM returned empty memory. Falling back to deterministic reflection.");
        nextMemory = buildMemoryFromSessions(existingMemory, sessions);
      } else {
        nextMemory = safeMemory;
        usedLlm = true;
      }

    } catch (error: any) {
      return {
        ok: false,
        dryRun: !!options.dryRun,
        sessionsRead: sessions.length,
        memoryPath: path.join(options.cwd, ".needle", "MEMORY.md"),
        proposedMemory: "",
        summary: `LLM reflection failed (invalid JSON or API error): ${error.message}`
      };
    }
  } else {
    // Deterministic Mode
    nextMemory = buildMemoryFromSessions(existingMemory, sessions);
  }
  
  // Format to string
  const formattedMemory = formatProjectMemory(nextMemory);
  const memoryPath = path.join(options.cwd, ".needle", "MEMORY.md");

  // Write if not dry-run
  if (!options.dryRun) {
    await writeProjectMemoryAtomic(options.cwd, nextMemory, { force: options.force });
  }

  let fallbackMsg = "";
  if (options.llm && !usedLlm) {
    fallbackMsg = " (fallback to deterministic)";
  }

  const modeStr = usedLlm ? `LLM-assisted (profile: ${options.profile || 'smart'})` : `deterministic${fallbackMsg}`;

  return {
    ok: true,
    dryRun: !!options.dryRun,
    sessionsRead: sessions.length,
    memoryPath,
    proposedMemory: formattedMemory,
    summary: `Reflected over ${sessions.length} sessions. Mode: ${modeStr}.`
  };
}
