import { Effect } from "effect";
import { applyPatch } from "diff";
import { NativeTool } from "../core/provider-types.js";
import { FileSystem } from "../core/filesystem.js";

export const applyPatchTool: NativeTool = {
  name: "apply_patch",
  description: "Apply a unified GNU-style diff to a file",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "The path to the file to patch" },
      patchText: { type: "string", description: "The unified diff string to apply" }
    },
    required: ["path", "patchText"]
  }
};

export const applyPatchHandler = (args: { path: string; patchText: string }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    
    const originalContent = yield* fs.readFile(args.path);
    
    const patchedContent = applyPatch(originalContent, args.patchText);
    
    if (typeof patchedContent === "string") {
      yield* fs.writeFile(args.path, patchedContent);
      return `Successfully applied patch to ${args.path}`;
    } else {
      return yield* Effect.fail(new Error(`Patch failed to apply cleanly to ${args.path}.`));
    }
  });
