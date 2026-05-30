import { execSync } from "node:child_process";
import type { ModelProfile, ChatMessage, ChatResponse } from "../providers/types.js";
import { buildProjectContext } from "../core/context-builder.js";
import { buildReviewerSystemPrompt, buildReviewerUserPrompt } from "../core/prompt-builder.js";
import { appendSessionRecord, createSessionId, SessionRecord } from "../core/session.js";

export interface DiffReviewOptions {
  cwd: string;
  staged?: boolean;
  profile?: ModelProfile;
  maxDiffBytes?: number;
  providerChat?: (messages: ChatMessage[]) => Promise<ChatResponse>;
}

export interface DiffReviewResult {
  ok: boolean;
  review: string;
  profile: ModelProfile;
  staged: boolean;
  diffBytes: number;
  truncated: boolean;
}

export async function runDiffReview(options: DiffReviewOptions): Promise<DiffReviewResult> {
  const startTime = Date.now();
  const staged = options.staged ?? false;
  const profile = options.profile ?? "reviewer";
  const maxDiffBytes = options.maxDiffBytes ?? 200 * 1024; // 200KB

  // Check if it's a git repo
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: options.cwd, stdio: "ignore" });
  } catch (error) {
    return {
      ok: false,
      review: "Not a git repository. Please run this command inside a git repository.",
      profile,
      staged,
      diffBytes: 0,
      truncated: false,
    };
  }

  // Get diff
  let diffCommand = "git diff";
  if (staged) {
    diffCommand = "git diff --staged";
  }

  let diff = "";
  try {
    diff = execSync(diffCommand, { cwd: options.cwd, encoding: "utf8" });
  } catch (error) {
    return {
      ok: false,
      review: "Failed to read git diff.",
      profile,
      staged,
      diffBytes: 0,
      truncated: false,
    };
  }

  if (!diff || diff.trim().length === 0) {
    return {
      ok: false,
      review: staged ? "No staged changes to review." : "No unstaged changes to review.",
      profile,
      staged,
      diffBytes: 0,
      truncated: false,
    };
  }

  let truncated = false;
  const diffBytes = Buffer.byteLength(diff, "utf8");
  if (diffBytes > maxDiffBytes) {
    truncated = true;
    const buf = Buffer.from(diff, "utf8");
    diff = buf.subarray(0, maxDiffBytes).toString("utf8");
  }

  // Build context
  const projectContext = await buildProjectContext({ cwd: options.cwd });

  // Build prompts
  const systemPrompt = buildReviewerSystemPrompt({
    projectContext,
    diff,
    staged,
    truncated,
  });

  const userPrompt = buildReviewerUserPrompt({
    projectContext,
    diff,
    staged,
    truncated,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  if (!options.providerChat) {
    throw new Error("providerChat implementation is required.");
  }

  try {
    const response = await options.providerChat(messages);
    const result: DiffReviewResult = {
      ok: true,
      review: response.content,
      profile,
      staged,
      diffBytes,
      truncated,
    };

    const record: SessionRecord = {
      id: createSessionId(),
      createdAt: new Date().toISOString(),
      mode: "review",
      task: `review ${staged ? 'staged' : 'unstaged'} diff`,
      cwd: options.cwd,
      profile: typeof profile === "string" ? profile : undefined,
      status: "success",
      durationMs: Date.now() - startTime,
      summary: response.content,
      artifacts: [staged ? "staged" : "unstaged"]
    };
    await appendSessionRecord(options.cwd, record);

    return result;
  } catch (error) {
    const errMsg = `Review failed: ${error instanceof Error ? error.message : String(error)}`;
    const result: DiffReviewResult = {
      ok: false,
      review: errMsg,
      profile,
      staged,
      diffBytes,
      truncated,
    };
    
    const record: SessionRecord = {
      id: createSessionId(),
      createdAt: new Date().toISOString(),
      mode: "review",
      task: `review ${staged ? 'staged' : 'unstaged'} diff`,
      cwd: options.cwd,
      profile: typeof profile === "string" ? profile : undefined,
      status: "failure",
      durationMs: Date.now() - startTime,
      summary: errMsg,
      errors: [errMsg],
      artifacts: [staged ? "staged" : "unstaged"]
    };
    await appendSessionRecord(options.cwd, record);

    return result;
  }
}
