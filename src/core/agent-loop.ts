// Needle core: agent-loop — Sprint 0 placeholder

export interface AgentLoop {
  start(): Promise<void>;
  stop(): void;
}

// TODO: implement actual loop in Sprint 1
export class NeedleAgentLoop implements AgentLoop {
  async start(): Promise<void> {
    throw new Error("NeedleAgentLoop.start() not yet implemented — Sprint 1");
  }

  stop(): void {
    // Sprint 1 placeholder
  }
}