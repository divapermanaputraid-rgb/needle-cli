import React, { useState, useEffect } from 'react';
import { render } from 'ink';
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

// Setup unified Live Layer
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
  const [status, setStatus] = useState("Initializing Engine...");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    const runV2 = async () => {
      const program = Effect.gen(function* () {
        const db = yield* Database;
        const toolRegistry = yield* ToolRegistry;
        const mcpClient = yield* McpClient;
        const provider = yield* Provider;

        setStatus("Connecting MCP...");
        yield* mcpClient.connect("github-mcp", "npx @modelcontextprotocol/server-github");
        yield* toolRegistry.registerMcpClient(mcpClient);
        addLog("MCP Connected");

        setStatus("Creating Session...");
        const sessionId = yield* db.createSession("V2 Live Session");
        addLog(`Session ${sessionId.substring(0, 8)} ready`);

        setStatus("Discovering Tools...");
        const tools = yield* toolRegistry.getTools();
        addLog(`${tools.length} tools loaded`);

        setStatus("Thinking...");
        const response = yield* provider.chat([{ role: "user", content: "search github" }], tools);
        
        if (response.tool_calls) {
          for (const call of response.tool_calls) {
            setStatus(`Executing ${call.function.name}...`);
            const result = yield* toolRegistry.execute(call.function.name, call.function.arguments);
            addLog(result);
          }
        }

        setStatus("Done");
        addLog("Needle v2 cycle complete.");
      });

      try {
        await Effect.runPromise(Effect.provide(program, MainLive));
      } catch (e) {
        addLog(`ERROR: ${e}`);
        setStatus("Crashed");
      }
    };

    runV2();
  }, []);

  return <App status={status} logs={logs} />;
};

render(<TuiRuntime />);
