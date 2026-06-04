import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUTE_CLARIFICATION_MESSAGE,
  RuntimeController,
} from "../../src/ui/interactive/runtime-controller.js";
import type {
  LLMRouteClassification,
  RouteClassifier,
  RouteClassifierInput,
} from "../../src/ui/interactive/llm-route-classifier.js";
import { NeedleConfigSchema } from "../../src/config/schema.js";
import type { ShellState } from "../../src/ui/interactive/shell-state.js";
import { ChatSession } from "../../src/ui/interactive/chat-session.js";
import { handleSlashCommand } from "../../src/ui/interactive/slash-commands.js";

function createState(models: Record<string, string> = { router: "router-model", fast: "fast-model" }): ShellState {
  return {
    cwd: process.cwd(),
    config: NeedleConfigSchema.parse({
      defaultProvider: "openrouter",
      models,
    }),
    provider: "openrouter",
    profile: "fast",
    modelId: null,
  };
}

function classification(
  overrides: Partial<LLMRouteClassification> = {},
): LLMRouteClassification {
  return {
    intent: "code_action",
    confidence: 0.9,
    reason: "Requests a workspace change.",
    task: "Classifier-only normalized task.",
    requiresConfirmation: false,
    ...overrides,
  };
}

class FakeClassifier implements RouteClassifier {
  calls: RouteClassifierInput[] = [];

  constructor(
    private readonly result: LLMRouteClassification | Error = classification(),
  ) {}

  async classify(input: RouteClassifierInput): Promise<LLMRouteClassification> {
    this.calls.push(input);
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

test("RuntimeController hybrid routing", async (t) => {
  await t.test("slash commands and /code bypass the classifier", async () => {
    const classifier = new FakeClassifier();
    const controller = new RuntimeController({ routeClassifier: classifier });
    let codeCalls = 0;
    controller.handleCodeAction = async () => {
      codeCalls += 1;
    };

    const state = createState();
    assert.equal(await handleSlashCommand("/whoami", state, new ChatSession(), undefined, controller), true);
    assert.equal(await handleSlashCommand("/code add a file", state, new ChatSession(), {} as never, controller), true);
    assert.equal(classifier.calls.length, 0);
    assert.equal(codeCalls, 1);
  });

  await t.test("simple folder, file, and follow-up actions bypass the classifier", async () => {
    const classifier = new FakeClassifier();
    const controller = new RuntimeController({ routeClassifier: classifier });
    const state = createState();

    assert.equal((await controller.resolveRoute("buat folder test-1", state)).intent?.intent, "code_action");
    assert.equal((await controller.resolveRoute("buat file test.md isinya hello", state)).intent?.intent, "code_action");
    assert.equal((await controller.resolveRoute("mana filenya?", state)).intent?.intent, "followup_lookup");
    assert.equal(classifier.calls.length, 0);
  });

  await t.test("complex action uses the classifier", async () => {
    const classifier = new FakeClassifier();
    const controller = new RuntimeController({ routeClassifier: classifier });
    const route = await controller.resolveRoute("tambahkan slash command /whoami", createState());

    assert.equal(route.intent?.intent, "code_action");
    assert.equal(route.intent?.inferredFrom, "llm-route-classifier");
    assert.equal(classifier.calls.length, 1);
  });

  await t.test("routes classifier chat and plan results", async () => {
    const chatController = new RuntimeController({
      routeClassifier: new FakeClassifier(classification({ intent: "chat" })),
    });
    const planController = new RuntimeController({
      routeClassifier: new FakeClassifier(classification({ intent: "plan" })),
    });

    assert.equal((await chatController.resolveRoute("what is this?", createState())).intent?.intent, "chat");
    assert.equal((await planController.resolveRoute("design the change", createState())).intent?.intent, "plan");
  });

  await t.test("asks clarification for low confidence, classifier errors, and missing profiles", async () => {
    const lowController = new RuntimeController({
      routeClassifier: new FakeClassifier(classification({ confidence: 0.4 })),
    });
    const errorController = new RuntimeController({
      routeClassifier: new FakeClassifier(new Error("invalid JSON")),
    });
    const noProfileController = new RuntimeController();

    assert.equal((await lowController.resolveRoute("ambiguous request", createState())).clarification, ROUTE_CLARIFICATION_MESSAGE);
    assert.equal((await errorController.resolveRoute("ambiguous request", createState())).clarification, ROUTE_CLARIFICATION_MESSAGE);
    assert.equal((await noProfileController.resolveRoute("ambiguous request", createState({}))).clarification, ROUTE_CLARIFICATION_MESSAGE);
  });

  await t.test("asks clarification when provider credentials are unavailable", async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const route = await new RuntimeController()
        .resolveRoute("ambiguous request", createState({ fast: "fast-model" }));
      assert.equal(route.clarification, ROUTE_CLARIFICATION_MESSAGE);
    } finally {
      if (originalKey === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = originalKey;
      }
    }
  });

  await t.test("prefers router profile and falls back to fast", async () => {
    const routerClassifier = new FakeClassifier();
    const fastClassifier = new FakeClassifier();
    await new RuntimeController({ routeClassifier: routerClassifier })
      .resolveRoute("ambiguous request", createState());
    await new RuntimeController({ routeClassifier: fastClassifier })
      .resolveRoute("ambiguous request", createState({ fast: "fast-model" }));

    assert.equal(routerClassifier.calls[0].profile, "router");
    assert.equal(fastClassifier.calls[0].profile, "fast");
  });

  await t.test("discards unsafe classifier paths", async () => {
    const classifier = new FakeClassifier(classification({
      targetPath: "../outside.txt",
      targetDirectory: ".git",
    }));
    const route = await new RuntimeController({ routeClassifier: classifier })
      .resolveRoute("ambiguous request", createState());

    assert.equal(route.intent?.targetPath, undefined);
    assert.equal(route.intent?.targetDirectory, undefined);
    assert.equal("requiresConfirmation" in (route.intent ?? {}), false);
  });

  await t.test("preserves original input as the execution task", async () => {
    let receivedInput = "";
    class CapturingController extends RuntimeController {
      override async handleCodeAction(input: string): Promise<void> {
        receivedInput = input;
      }
    }
    const controller = new CapturingController({
      routeClassifier: new FakeClassifier(classification({ task: "replace the user's task" })),
    });

    await controller.handleUserInput(
      "tambahkan slash command /whoami",
      createState(),
      new ChatSession(),
      {} as never,
    );
    assert.equal(receivedInput, "tambahkan slash command /whoami");
  });

  await t.test("obvious action route never instructs the user to use /code", async () => {
    const controller = new RuntimeController();
    const state: ShellState = {
      cwd: process.cwd(),
      config: null,
      provider: null,
      profile: null,
      modelId: null,
    };
    const originalLog = console.log;
    let output = "";
    console.log = (...args: unknown[]) => {
      output += `${args.join(" ")}\n`;
    };
    try {
      await controller.handleUserInput("buat folder test-1", state, new ChatSession(), {} as never);
    } finally {
      console.log = originalLog;
    }

    assert.equal(output.includes("use /code"), false);
    assert.equal(output.includes("Use /code"), false);
  });
});
