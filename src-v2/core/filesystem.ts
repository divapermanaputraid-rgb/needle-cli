import { Effect } from "effect";
import * as fs from "node:fs/promises";

export class FileSystem extends Effect.Service<FileSystem>()("@needle/FileSystem", {
  succeed: {
    readFile: (path: string) => 
      Effect.tryPromise({
        try: () => fs.readFile(path, "utf-8"),
        catch: (error) => error as Error,
      }),
    writeFile: (path: string, content: string) =>
      Effect.tryPromise({
        try: () => fs.writeFile(path, content, "utf-8"),
        catch: (error) => error as Error,
      }),
  },
}) {}
