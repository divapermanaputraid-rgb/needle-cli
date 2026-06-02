# Needle CLI Workspace

## Overview
Needle is a terminal-first AI coding agent that threads through your codebase. It allows developers to run an agentic coding workflow (think → plan → act → observe → refine) directly from the terminal.

## Key Features
- **Agentic Coding Loop:** Inspects projects, chooses tools, edits files, and runs commands.
- **Project Memory:** Persistent context stored in `.needle/MEMORY.md`.
- **Multi-Provider Support:** Supports 9Router, OpenRouter, OpenAI-compatible APIs, Gemini, and DeepSeek.
- **Built-in Tools:** File I/O, shell execution, glob/grep search, git diff, and more.
- **Safety-First:** Permission modes (`ask`, `auto`, `dry-run`) to protect the workspace.

## Tech Stack
- Node.js
- TypeScript
- React
- Package Manager: pnpm

## Core CLI Commands
- `needle init`: Initialize project
- `needle code`: Run the coding agent loop
- `needle plan`: Generate implementation plans
- `needle review`: Review git diffs
- `needle reflect`: Update project memory
