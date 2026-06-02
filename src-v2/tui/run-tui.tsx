import React, { useState, useCallback } from 'react';
import { render, useApp } from 'ink';
import { Effect, Layer } from 'effect';
import { App } from './app.js';

// Import Services & Layers from Core
import { Logger } from '../core/logger.js';
import { ConfigProvider } from '../core/config.js';
import { FileSystem } from '../core/filesystem.js';
import { Database } from '../core/database.js';
import { Provider } from '../core/provider.js';
import { ToolRegistry } from '../core/tool-registry.js';
import { SecurityGuard } from '../core/security-ast.js';
import { McpClient } from '../core/mcp.js';
import { applyPatchTool, applyPatchHandler } from "../tools/apply_patch.js";
import { shellTool, shellHandler } from "../tools/shell.js";

// Build the global MainLive Layer carefully
const MainLive = Layer.mergeAll(
  Logger.Default,
  ConfigProvider.Default,
  FileSystem.Default,
  Database.Default,
  Provider.Default,
  ToolRegistry.Default,
  SecurityGuard.Default,
  McpClient.Default
);

const TuiRuntime = () => {
  const [status, setStatus] = useState("Ready");
  const [logs, setLogs] = useState<string[]>(["Needle v2 (Super Agent Mode) Activated"]);
  const { exit } = useApp();

  const addLog = useCallback((msg: string) => setLogs(prev => [...prev, msg]), []);

  const handleSubmit = async (input: string) => {
    const trimmedInput = input.trim();
    if (trimmedInput === "/exit") {
      exit();
      return;
    }

    // Wrap the inner logic inside Effect.gen
    const program = Effect.gen(function* () {
      const configProvider = yield* ConfigProvider;
      const toolRegistry = yield* ToolRegistry;
      const provider = yield* Provider;
      const db = yield* Database;
      
      // Handle Slash Commands
      if (trimmedInput.startsWith("/provider ")) {
        const name = trimmedInput.split(" ")[1];
        yield* configProvider.setProvider(name);
        addLog(`Switched provider to ${name}`);
        return;
      }

      // Initialize Tools (for MVP, ensure they are registered)
      yield* toolRegistry.register(applyPatchTool, applyPatchHandler);
      yield* toolRegistry.register(shellTool, shellHandler);
      
      const mcpClient = yield* McpClient;
      yield* toolRegistry.registerMcpClient(mcpClient);

      setStatus("Thinking...");
      const sessionId = yield* db.createSession(trimmedInput);
      const tools = yield* toolRegistry.getTools();
      
      const response = yield* provider.chat([{ role: "user", content: trimmedInput }], tools);
      
      if (response.tool_calls) {
        for (const call of response.tool_calls) {
          setStatus(`Executing ${call.function.name}...`);
          const result = yield* Effect.either(toolRegistry.execute(call.function.name, call.function.arguments));
          if (result._tag === "Left") {
            addLog(`BLOCKED/FAILED: ${result.left.message}`);
          } else {
            addLog(result.right);
          }
        }
      } else if (response.content) {
        addLog(response.content);
      }

      setStatus("Ready");
    });

    try {
      // Execute with the merged global layer
      await Effect.runPromise(Effect.provide(program, MainLive));
    } catch (e) {
      addLog(`CRASH: ${e}`);
      setStatus("Error");
    }
  };

  return <App status={status} logs={logs} onSubmit={handleSubmit} />;
};

render(<TuiRuntime />);
