import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("@needle/Logger", {
  succeed: {
    log: (message: string) => Effect.sync(() => console.log(message)),
    error: (message: string) => Effect.sync(() => console.error(message)),
  },
}) {}
