import * as readline from 'node:readline';
import { ShellState } from './shell-state.js';
import { ChatSession } from './chat-session.js';
import { TaskNormalizer } from './task-normalizer.js';
import { ReferenceResolver } from './reference-resolver.js';
import { SessionState } from './session-state.js';
import { handleInteractiveChat } from './interactive-chat.js';
import { runCodeAction } from './code-action-runner.js';
import { runDocumentation } from './documentation-runner.js';
import { runPlanMode } from '../../planner/plan-mode.js';
import { createProviderRouter } from '../../providers/router.js';
import { ModelProfile } from '../../providers/types.js';

export class RuntimeController {
  private sessionState = new SessionState();
  private normalizer = new TaskNormalizer();
  private resolver = new ReferenceResolver(this.sessionState.toolObservations);

  async handleUserInput(
    input: string,
    state: ShellState,
    chatSession: ChatSession,
    rl?: readline.Interface
  ): Promise<void> {
    const intentData = this.normalizer.normalize(input);

    if (intentData.intent === "followup_lookup") {
      const lastFile = this.resolver.resolveTargetFile(input) || this.sessionState.toolObservations.getLastCreatedFile();
      const lastDir = this.resolver.resolveTargetDirectory(input) || this.sessionState.toolObservations.getLastCreatedDirectory();
      // Proceed to chat
    } else if (intentData.intent === "code_action") {
      const targetDir = this.resolver.resolveTargetDirectory(input, intentData.targetDirectory);
      const targetFile = this.resolver.resolveTargetFile(input, intentData.targetPath);
      if (targetDir) intentData.targetDirectory = targetDir;
      if (targetFile) intentData.targetPath = targetFile;
    } else if (intentData.intent === "write_documentation") {
      const targetDir = this.resolver.resolveTargetDirectory(input, intentData.targetDirectory);
      if (targetDir) intentData.targetDirectory = targetDir;
    }

    this.sessionState.updateLastTask(input, intentData.intent);

    if (intentData.intent === 'code_action') {
      if (rl) {
        await this.handleCodeAction(input, state, chatSession, rl, intentData);
        return;
      }
    } else if (intentData.intent === 'write_documentation') {
      if (rl) {
        if (!state.config) {
           console.log('Needle is not configured yet.\nRun /settings to connect a provider and model.');
           return;
        }
        const router = createProviderRouter(state.config);
        const targetProfile = this.getTargetProfile(state);
        const providerId = (state.provider || state.config.defaultProvider) as string;

        if (!targetProfile) {
           console.log('Model profile missing. Run /settings or /model smart <modelId>.');
           return;
        }

        const result = await runDocumentation({
          input,
          cwd: state.cwd,
          history: chatSession.getHistory(),
          config: state.config,
          router,
          targetProfile,
          providerId,
          rl,
          sessionState: this.sessionState,
          intent: intentData
        });
        if (result) {
          chatSession.addMessage({ role: 'user', content: input });
          chatSession.addMessage({ role: 'assistant', content: result.summary });
        }
        return;
      }
    } else if (intentData.intent === 'plan') {
      await this.handlePlanAction(input, state);
      return;
    }

    // Default to chat (includes followup_lookup)
    await handleInteractiveChat(input, state, chatSession, rl);
  }

  async handleCodeAction(
    input: string,
    state: ShellState,
    chatSession: ChatSession,
    rl: readline.Interface,
    intentData?: any
  ): Promise<void> {
    if (!state.config) {
      console.log('Needle is not configured yet.\nRun /settings to connect a provider and model.');
      return;
    }
    const router = createProviderRouter(state.config);
    const targetProfile = this.getTargetProfile(state);
    const providerId = (state.provider || state.config.defaultProvider) as string;

    if (!targetProfile) {
      console.log('Model profile missing. Run /settings or /model smart <modelId>.');
      return;
    }

    const intent = intentData || this.normalizer.normalize(input);
    this.sessionState.updateLastTask(input, intent.intent);

    const result = await runCodeAction({
      input,
      cwd: state.cwd,
      history: chatSession.getHistory(),
      config: state.config,
      router,
      targetProfile,
      providerId,
      rl,
      sessionState: this.sessionState,
      intent
    });

    if (result) {
      chatSession.addMessage({ role: 'user', content: input });
      chatSession.addMessage({ role: 'assistant', content: result.summary });
    }
  }

  async handlePlanAction(input: string, state: ShellState): Promise<void> {
    const red = '\x1b[31m';
    const reset = '\x1b[0m';
    
    if (!state.config) {
      console.log('Needle is not configured yet.\nRun /settings to connect a provider and model.');
      return;
    }

    console.log('\nRunning plan workflow...');
    try {
      const targetProfile = this.getTargetProfile(state);
      const planProfile: ModelProfile = state.config.models.planner ? 'planner' : targetProfile!;
      const result = await runPlanMode({
        cwd: state.cwd,
        task: input,
        profile: planProfile
      });
      console.log(`\n${result.plan}`);
    } catch (err: any) {
      console.log(`\n${red}Plan Workflow Error: ${err.message}${reset}`);
    }
  }

  private getTargetProfile(state: ShellState): ModelProfile | undefined {
    if (!state.config) return undefined;
    let targetProfile: ModelProfile | undefined;
    const profiles: ModelProfile[] = ['smart', 'coder', 'fast'];
    for (const p of profiles) {
      try {
        if (state.config.models[p]) {
          targetProfile = p;
          break;
        }
      } catch {
        // ignore
      }
    }
    return targetProfile;
  }
}