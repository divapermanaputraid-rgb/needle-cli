import { ToolObservationStore } from "./tool-observation-store.js";

export class SessionState {
  public toolObservations: ToolObservationStore;
  public lastTask: string | null = null;
  public lastTaskIntent: string | null = null;

  constructor() {
    this.toolObservations = new ToolObservationStore();
  }

  updateLastTask(task: string, intent: string) {
    this.lastTask = task;
    this.lastTaskIntent = intent;
  }
}