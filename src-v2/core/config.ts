import { Context, Effect, Ref, Layer } from "effect";

export interface Config {
  readonly cwd: string;
  readonly smartModel: string;
  readonly coderModel: string;
  readonly isYoloMode: boolean;
}

export class ConfigProvider extends Context.Tag("@needle/ConfigProvider")<
  ConfigProvider,
  {
    readonly getConfig: () => Effect.Effect<Config>;
    readonly getActiveProvider: () => Effect.Effect<string>;
    readonly setProvider: (name: string) => Effect.Effect<void>;
  }
>() {
  static readonly Default = Layer.effect(ConfigProvider, Effect.gen(function* () {
    const activeProvider = yield* Ref.make("mock");
    const config: Config = {
      cwd: process.cwd(),
      smartModel: "gpt-4o",
      coderModel: "claude-3-5-sonnet-20241022",
      isYoloMode: false,
    };

    return {
      getConfig: () => Effect.succeed(config),
      getActiveProvider: () => Ref.get(activeProvider),
      setProvider: (name: string) => Ref.set(activeProvider, name),
    };
  }));
}
