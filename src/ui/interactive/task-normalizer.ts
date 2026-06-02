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

    // 1. Follow-up lookup
    if (
      text === "mana filenya?" || 
      text === "mana foldernya?" || 
      text.includes("mana filenya") || 
      text.includes("mana foldernya") ||
      text.includes("tadi lu bikin apa") ||
      text.includes("file apa yang tadi dibuat") ||
      text.includes("what did you change") ||
      text.includes("where is it")
    ) {
      return { intent: "followup_lookup", needsClarification: false };
    }

    // 2. Plan mode
    if (text.includes("bikin plan") || text.includes("buat plan") || text.includes("plan fitur")) {
      return { intent: "plan", needsClarification: false };
    }

    // 3. Documentation
    const docsKeywords = ["docs", "panduan install", "client install", "dokumentasi", "documentation"];
    if (docsKeywords.some(kw => text.includes(kw))) {
      return { intent: "write_documentation", needsClarification: false };
    }

    if (text.includes("buat file") && text.includes(".md") && (text.includes("di dalam") || text.includes("mana"))) {
      return { intent: "write_documentation", needsClarification: false };
    }

    // 4. Code Actions (Folder)
    const folderMatch = input.match(/(?:buat|buatkan|bikin) folder ([\w.-]+)/i);
    if (folderMatch) {
      const dirName = folderMatch[1];
      // Exclude question words from being captured as directory names
      if (!["mana", "apa", "gimana", "where", "what", "how"].includes(dirName.toLowerCase())) {
         return {
           intent: "code_action",
           targetDirectory: dirName,
           needsClarification: false
         };
      }
    }

    // 5. Code Actions (File + Content)
    const fileMatch = input.match(/(?:buat|buatkan|bikin) file ([\w.-]+) isinya (.*)/i);
    if (fileMatch) {
      const fileName = fileMatch[1];
      if (!["mana.md", "apa.md", "gimana.md", "where.md", "what.md", "how.md"].includes(fileName.toLowerCase())) {
        return {
          intent: "code_action",
          targetPath: fileName,
          contentGoal: fileMatch[2].trim(),
          needsClarification: false
        };
      } else {
        // It's a question word used incorrectly as a filename, strip it and use context
        return { intent: "code_action", needsClarification: true, clarificationQuestion: "I'm not sure what file you want to create." };
      }
    }

    // 6. Code Actions (File only)
    if (text.includes("buat file") || text.includes("buatkan file") || text.includes("bikin file")) {
      const match = input.match(/(?:buat|buatkan|bikin) file ([\w.-]+)/i);
      if (match) {
        const fileName = match[1];
        if (!["mana.md", "apa.md", "gimana.md", "where.md", "what.md", "how.md"].includes(fileName.toLowerCase())) {
          return {
            intent: "code_action",
            targetPath: fileName,
            needsClarification: false
          };
        } else {
           // E.g., "mana di dalam nya buat file .md dulu dong" => targetPath is not "mana"
           // Let the reference resolver figure it out
           return {
             intent: "code_action",
             needsClarification: false
           };
        }
      }
    }

    // 6.5 Other code actions
    const otherCodeActions = [
      "tambahkan command",
      "edit file",
      "fix error",
      "jalankan test"
    ];
    if (otherCodeActions.some(kw => text.includes(kw))) {
      return { intent: "code_action", needsClarification: false };
    }

    // 7. Chat
    if (text.includes("jelas") && (text.includes("project") || text.includes("workspace") || text.includes("ini"))) {
      return { intent: "chat", needsClarification: false };
    }

    return { intent: "chat", needsClarification: false };
  }
}
