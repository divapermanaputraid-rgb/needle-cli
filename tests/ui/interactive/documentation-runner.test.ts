import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { runDocumentation } from "../../../src/ui/interactive/documentation-runner.js";
import { SessionState } from "../../../src/ui/interactive/session-state.js";
import { ProviderRouter } from "../../../src/providers/router.js";
import { NeedleConfig } from "../../../src/config/schema.js";
import os from "node:os";

test("DocumentationRunner tests", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "needle-test-"));
  
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const mockConfig: NeedleConfig = {
    models: {
      smart: "test-model"
    },
    defaultProvider: "test-provider",
    providers: {},
    security: {
      allowShell: true,
      allowFileRead: true,
      allowFileWrite: true,
      allowGit: true,
      autoApprove: true,
      maxTokens: 1000
    },
    tools: {
      enabled: [],
      blocked: []
    }
  };

  const mockRouter = {
    chatWithProfile: async () => ({ content: "Here is the documentation." })
  } as unknown as ProviderRouter;

  const mockRl = {
    pause: () => {},
    resume: () => {},
    question: (query: string, cb: (ans: string) => void) => cb("y")
  } as any;

  await t.test("docs request with lastCreatedDirectory chooses test-1/README.md", async () => {
    const sessionState = new SessionState();
    sessionState.toolObservations.record({ toolName: "dir.create", input: { path: "test-1" }, ok: true, metadata: { path: "test-1", created: true } });
    
    const result = await runDocumentation({
      input: "isi di dalamnya dengan docs lengkap",
      cwd: tmpDir,
      history: [],
      config: mockConfig,
      router: mockRouter,
      targetProfile: "smart",
      providerId: "test-provider",
      rl: mockRl,
      sessionState,
      intent: { intent: "write_documentation" }
    });

    assert.ok(result);
    
    // Verify file exists
    const stat = await fs.stat(path.join(tmpDir, "test-1/README.md"));
    assert.ok(stat.isFile());
    
    // Verify tool observations
    assert.equal(sessionState.toolObservations.getLastCreatedFile(), path.join("test-1", "README.md"));
  });

  await t.test("docs request without target asks clarification (returns undefined)", async () => {
    const sessionState = new SessionState();
    
    const result = await runDocumentation({
      input: "buat docs",
      cwd: tmpDir,
      history: [],
      config: mockConfig,
      router: mockRouter,
      targetProfile: "smart",
      providerId: "test-provider",
      rl: mockRl,
      sessionState,
      intent: { intent: "write_documentation" }
    });

    assert.equal(result, undefined);
  });
});