# FungiCode Architecture

## Overview
FungiCode is built as an open-source, multi-provider AI coding CLI inspired by modern agentic coding assistants and terminal-first developer workflows.

## Key Subsystems
1. **Providers**: Pluggable interface for LLM backends.
2. **Tools**: Sandboxed filesystem and shell operations.
3. **Agent Loop**: Prompting, context building, and tool calling orchestration.
4. **Permissions**: Policy-based execution boundaries.
5. **Memory**: Project-level durable memory (`.fungi/MEMORY.md`).
