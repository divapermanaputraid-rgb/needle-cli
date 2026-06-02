export interface ToolObservation {
  toolName: string;
  input: Record<string, unknown>;
  ok: boolean;
  output: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export class ToolObservationStore {
  private observations: ToolObservation[] = [];
  private lastMentionedPath?: string;

  record(observation: Omit<ToolObservation, "timestamp">): void {
    this.observations.push({
      ...observation,
      timestamp: Date.now()
    });
  }

  setLastMentionedPath(path: string): void {
    this.lastMentionedPath = path;
  }

  getRecent(limit: number = 10): ToolObservation[] {
    return this.observations.slice(-limit);
  }

  getCreatedFiles(): string[] {
    return this.observations
      .filter(o => o.toolName === "file.write" && o.ok && o.metadata?.created)
      .map(o => o.metadata?.path as string)
      .filter(Boolean);
  }

  getCreatedDirectories(): string[] {
    return this.observations
      .filter(o => o.toolName === "dir.create" && o.ok && o.metadata?.created)
      .map(o => o.metadata?.path as string)
      .filter(Boolean);
  }

  updateLastCreatedFile(displayPath: string, absolutePath?: string): void {
    this.observations.push({
      toolName: "file.write",
      ok: true,
      input: { path: absolutePath || displayPath },
      output: "",
      metadata: { path: displayPath, absolutePath, created: true },
      timestamp: Date.now()
    });
  }

  updateLastCreatedDirectory(displayPath: string, absolutePath?: string): void {
    this.observations.push({
      toolName: "dir.create",
      ok: true,
      input: { path: absolutePath || displayPath },
      output: "",
      metadata: { path: displayPath, absolutePath, created: true },
      timestamp: Date.now()
    });
  }

  getLastCreatedDirectory(): string | undefined {
    const dirs = this.getCreatedDirectories();
    return dirs[dirs.length - 1];
  }

  getLastModifiedDirectory(): string | undefined {
    const lastFile = this.getLastModifiedFile();
    if (lastFile) {
      const parts = lastFile.split("/");
      if (parts.length > 1) {
        return parts.slice(0, -1).join("/");
      }
    }
    return this.getLastCreatedDirectory();
  }

  getLastCreatedFile(): string | undefined {
    const files = this.getCreatedFiles();
    return files[files.length - 1];
  }

  getLastModifiedFile(): string | undefined {
    const modifications = this.observations
      .filter(o => (o.toolName === "file.write" || o.toolName === "file.edit") && o.ok)
      .map(o => o.metadata?.path as string)
      .filter(Boolean);
    return modifications[modifications.length - 1];
  }

  getLastMentionedPath(): string | undefined {
    return this.lastMentionedPath;
  }

  getLastActionSummary(): string {
    const recent = this.observations[this.observations.length - 1];
    if (!recent) return "No recent actions.";
    return `Last action: ${recent.toolName} ${recent.ok ? "succeeded" : "failed"}. ${recent.output}`;
  }

  clear(): void {
    this.observations = [];
    this.lastMentionedPath = undefined;
  }
}