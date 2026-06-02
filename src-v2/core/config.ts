import { Effect } from "effect";

export class ConfigProvider extends Effect.Service<ConfigProvider>()("@needle/ConfigProvider", {
  succeed: {
    cwd: process.cwd(),
    smartModel: "gpt-4o",
    coderModel: "claude-3-5-sonnet-20241022",
  },
}) {}
