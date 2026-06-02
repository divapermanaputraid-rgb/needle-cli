import { ToolObservationStore } from "./tool-observation-store";

export class ReferenceResolver {
  constructor(private observationStore: ToolObservationStore) {}

  private readonly questionWords = [
    "mana", "apa", "gimana", "where", "what", "how", "siapa", "kapan", "mengapa", "why", "who", "when"
  ];

  isQuestionWord(word: string): boolean {
    const cleanWord = word.toLowerCase().replace(/\.md$/, "");
    return this.questionWords.includes(cleanWord);
  }

  resolveTargetDirectory(input: string, explicitPath?: string): string | undefined {
    if (explicitPath && !this.isQuestionWord(explicitPath)) {
      return explicitPath;
    }

    const text = input.toLowerCase();
    const hasDirReference = [
      "di dalamnya", "di folder tadi", "folder tadi", "itu", "di situ",
      "there", "inside it", "the previous folder", "di dalam nya", "di dalam"
    ].some(ref => text.includes(ref));

    if (hasDirReference) {
      return this.observationStore.getLastCreatedDirectory() ||
             this.observationStore.getLastModifiedDirectory() ||
             this.observationStore.getLastCreatedFile() ||
             this.observationStore.getLastModifiedFile() ||
             this.observationStore.getLastMentionedPath();
    }

    return undefined;
  }

  resolveTargetFile(input: string, explicitPath?: string): string | undefined {
    if (explicitPath && !this.isQuestionWord(explicitPath)) {
      return explicitPath;
    }

    const text = input.toLowerCase();
    const hasFileReference = [
      "file tadi", "itu", "filenya", "the file", "the previous file", "di situ"
    ].some(ref => text.includes(ref));

    if (hasFileReference) {
      return this.observationStore.getLastCreatedFile() ||
             this.observationStore.getLastModifiedFile() ||
             this.observationStore.getLastMentionedPath();
    }

    return undefined;
  }
}