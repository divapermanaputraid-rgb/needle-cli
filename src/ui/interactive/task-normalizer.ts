export interface TaskIntent {
  intent: "chat" | "plan" | "code_action" | "write_documentation" | "followup_lookup";
  targetPath?: string;
  targetDirectory?: string;
  contentGoal?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  inferredFrom?: string;
}

export class TaskNormalizer {
  normalize(input: string): TaskIntent {
    const text = input.toLowerCase();

    if (text === "mana filenya?" || text === "mana foldernya?" || text.includes("mana filenya") || text.includes("mana foldernya")) {
      return { intent: "followup_lookup", needsClarification: false };
    }

    if (text.includes("bikin plan") || text.includes("buat plan") || text.includes("plan fitur")) {
      return { intent: "plan", needsClarification: false };
    }

    const docsKeywords = ["docs", "panduan install", "client install", "dokumentasi", "documentation"];
    if (docsKeywords.some(kw => text.includes(kw))) {
      return { intent: "write_documentation", needsClarification: false };
    }

    if (text.includes("buat file") && text.includes(".md") && (text.includes("di dalam") || text.includes("mana"))) {
      return { intent: "write_documentation", needsClarification: false };
    }

    const folderMatch = input.match(/buat folder ([\w.-]+)/i);
    if (folderMatch) {
      return {
        intent: "code_action",
        targetDirectory: folderMatch[1],
        needsClarification: false
      };
    }

    const fileMatch = input.match(/buat file ([\w.-]+) isinya (.*)/i);
    if (fileMatch) {
      return {
        intent: "code_action",
        targetPath: fileMatch[1],
        contentGoal: fileMatch[2].trim(),
        needsClarification: false
      };
    }

    if (text.includes("buat file")) {
      const match = input.match(/buat file ([\w.-]+)/i);
      if (match) {
        return {
          intent: "code_action",
          targetPath: match[1],
          needsClarification: false
        };
      }
    }

    if (text.includes("jelas") && (text.includes("project") || text.includes("workspace"))) {
      return { intent: "chat", needsClarification: false };
    }

    return { intent: "chat", needsClarification: false };
  }
}