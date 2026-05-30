import { createEmptyProjectMemory } from "../../src/memory/project-memory.js";
import { buildMemoryFromSessions } from "../../src/memory/reflector.js";

const mem = createEmptyProjectMemory();
const sessions = [{
  id: "s1",
  timestamp: new Date().toISOString(),
  task: "Fix key",
  mode: "code" as const,
  summary: "- Added key sk-ant-api03-abcdef1234567890"
}];

const result = buildMemoryFromSessions(mem, sessions);
console.log(JSON.stringify(result, null, 2));
