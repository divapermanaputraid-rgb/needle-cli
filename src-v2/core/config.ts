import { Effect } from "effect";

export interface Config {
  readonly cwd: string;
  readonly smartModel: string;
  readonly coderModel: string;
  readonly isYoloMode: boolean;
}

export class ConfigProvider extends Effect.Service<ConfigProvider>()("@needle/ConfigProvider", {
  succeed: {
    cwd: process.cwd(),
    smartModel: "gpt-4o",
    coderModel: "claude-3-5-sonnet-20241022",
    isYoloMode: true,
  },
}) {}
