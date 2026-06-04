export type TaskIntentName =
  | "chat"
  | "plan"
  | "code_action"
  | "write_documentation"
  | "followup_lookup";

export interface TaskIntent {
  intent: TaskIntentName;
  targetPath?: string;
  targetDirectory?: string;
  contentGoal?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  inferredFrom?: string;
}

export interface DeterministicRouteCandidate extends TaskIntent {
  confidence: number;
}

export const DETERMINISTIC_ROUTE_THRESHOLD = 0.9;

export class TaskNormalizer {
  normalize(input: string): DeterministicRouteCandidate {
    const text = input.trim().toLowerCase();

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
      return { intent: "followup_lookup", confidence: 0.98, needsClarification: false };
    }

    if (text.includes("bikin plan") || text.includes("buat plan") || text.includes("plan fitur")) {
      return { intent: "plan", confidence: 0.98, needsClarification: false };
    }

    const docsKeywords = ["docs", "panduan install", "client install", "dokumentasi", "documentation"];
    if (docsKeywords.some(keyword => text.includes(keyword))) {
      return { intent: "write_documentation", confidence: 0.95, needsClarification: false };
    }

    if (text.includes("buat file") && text.includes(".md") && (text.includes("di dalam") || text.includes("mana"))) {
      return { intent: "write_documentation", confidence: 0.95, needsClarification: false };
    }

    const folderMatch = input.match(/(?:buat|buatkan|bikin) folder ([\w.-]+)/i);
    if (folderMatch) {
      const dirName = folderMatch[1];
      if (!["mana", "apa", "gimana", "where", "what", "how"].includes(dirName.toLowerCase())) {
        return {
          intent: "code_action",
          confidence: 0.99,
          targetDirectory: dirName,
          needsClarification: false,
        };
      }
    }

    const fileMatch = input.match(/(?:buat|buatkan|bikin) (?:file )?([\w.-]+\.[\w.-]+) isinya (.*)/i);
    if (fileMatch) {
      const fileName = fileMatch[1];
      if (!["mana.md", "apa.md", "gimana.md", "where.md", "what.md", "how.md"].includes(fileName.toLowerCase())) {
        return {
          intent: "code_action",
          confidence: 0.99,
          targetPath: fileName,
          contentGoal: fileMatch[2].trim(),
          needsClarification: false,
        };
      }
      return {
        intent: "code_action",
        confidence: 0.99,
        needsClarification: true,
        clarificationQuestion: "I'm not sure what file you want to create.",
      };
    }

    if (text.includes("buat file") || text.includes("buatkan file") || text.includes("bikin file")) {
      const match = input.match(/(?:buat|buatkan|bikin) file ([\w.-]+)/i);
      if (match) {
        const fileName = match[1];
        if (!["mana.md", "apa.md", "gimana.md", "where.md", "what.md", "how.md"].includes(fileName.toLowerCase())) {
          return {
            intent: "code_action",
            confidence: 0.99,
            targetPath: fileName,
            needsClarification: false,
          };
        }
      }
    }

    const otherCodeActions = [
      "tambahkan command",
      "tambah command",
      "implement command",
      "tambahkan slash command",
      "tambahkan test",
      "update test",
      "cari file yang benar lalu implement",
      "jalankan pnpm typecheck",
      "jalankan pnpm test",
      "fix failing test",
      "edit source",
      "modify source",
      "update src",
      "buat command baru",
      "edit file",
      "fix error",
      "jalankan test",
    ];
    if (otherCodeActions.some(keyword => text.includes(keyword))) {
      return { intent: "code_action", confidence: 0.65, needsClarification: false };
    }

    const actionVerbs = ["tambahkan", "tambah", "implement", "ubah", "edit", "update", "fix", "perbaiki", "buatkan", "buat", "jalankan", "run", "modify"];
    const actionTargets = ["command", "slash command", "test", "source", "file", "pnpm", "typecheck", "src/", "tests/"];
    const hasVerb = actionVerbs.some(verb => new RegExp(`\\b${verb}\\b`, "i").test(text));
    const hasTarget = actionTargets.some(target => new RegExp(`\\b${target}\\b`, "i").test(text));
    if (hasVerb && hasTarget) {
      return { intent: "code_action", confidence: 0.65, needsClarification: false };
    }

    if (text.includes("jelas") && (text.includes("project") || text.includes("workspace") || text.includes("ini"))) {
      return { intent: "chat", confidence: 0.95, needsClarification: false };
    }

    if (/^(halo|hello|hi|hey|hai)([!. ]*)$/i.test(text)) {
      return { intent: "chat", confidence: 0.98, needsClarification: false };
    }

    return { intent: "chat", confidence: 0.5, needsClarification: false };
  }
}
