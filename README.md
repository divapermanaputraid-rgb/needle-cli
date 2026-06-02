<div align="center">
  <img src="assets/needle-hero.png" alt="Needle - terminal-first AI coding agent" width="100%" />

  <br />

  <p>
    <strong>A terminal-first AI coding agent that threads through your codebase.</strong>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/needle-cli">
      <img src="https://img.shields.io/npm/v/needle-cli?style=flat-square&color=4F7CFF" alt="npm version" />
    </a>
    <a href="https://www.npmjs.com/package/needle-cli">
      <img src="https://img.shields.io/npm/dm/needle-cli?style=flat-square&color=36E4C6" alt="npm downloads" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-7C5CFF?style=flat-square" alt="license" />
    </a>
    <img src="https://img.shields.io/badge/terminal-first-4F7CFF?style=flat-square" alt="terminal first" />
    <img src="https://img.shields.io/badge/multi--provider-36E4C6?style=flat-square" alt="multi provider" />
    <img src="https://img.shields.io/badge/status-beta-F59E0B?style=flat-square" alt="beta" />
  </p>

  <p>
    <a href="#install">Install</a>
    ·
    <a href="#quickstart">Quickstart</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#commands">Commands</a>
    ·
    <a href="#providers">Providers</a>
    ·
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

## Needle

**Needle** is an open-source, terminal-native AI coding CLI.

It reads your codebase, plans changes, edits files, runs commands, reviews diffs, and keeps project memory close to your repository. It is built for developers who want an agentic coding workflow without leaving the terminal.

```bash
needle code "Refactor the authentication middleware"
```

```txt
$ needle
> scan repo
✓ plan
✓ patch
✓ review
✓ remember
```

Needle is designed to be lightweight, provider-agnostic, and safe by default.

## Why Needle?

Most AI coding tools are either locked into one editor, tied to one model provider, or too heavy for quick terminal work.

Needle focuses on a smaller, sharper workflow:

- terminal-first AI coding
- multi-provider model routing
- project-aware code editing
- persistent project memory
- safe tool execution
- reviewable file changes
- spec-first planning before implementation

The goal is not to replace your editor.

The goal is to make your terminal a better coding partner.

## Features

### Agentic coding loop

Needle uses a simple agentic loop:

```txt
think → plan → act → observe → refine
```

It can inspect your project, choose tools, edit files, run commands, and continue based on the result.

### Project memory

Needle stores long-term project context in:

```txt
.needle/MEMORY.md
```

Use memory to preserve architecture decisions, conventions, TODOs, previous fixes, and project-specific rules.

```bash
needle reflect
```

### Multi-provider support

Use your preferred model provider instead of being locked into one platform.

Supported provider targets:

- 9Router
- OpenRouter
- OpenAI-compatible APIs
- Gemini
- DeepSeek
- local or self-hosted compatible endpoints

### Built-in tools

Needle gives the agent practical development tools:

- file read
- file write
- file edit
- shell execution
- glob search
- grep search
- git diff
- project memory
- session history

### Safety-first permissions

Needle can modify files and execute commands, so permission modes are built in.

```bash
needle code "Update dependencies" --mode ask
```

Permission modes:

| Mode      | Behavior                                               |
| --------- | ------------------------------------------------------ |
| `ask`     | Default. Ask before running commands or writing files. |
| `auto`    | Run safe actions automatically, ask for risky actions. |
| `dry-run` | Show intended actions without applying them.           |

### PRD mode

Turn a rough idea into a clear Product Requirements Document before writing code.

```bash
needle prd
```

Needle will interview you, ask important product and technical questions, then generate a reviewable PRD inside your workspace.

Example:

```txt
What do you want to build?
> A simple attendance system for interns using photo and GPS

Needle asks:
- target platform
- user roles
- auth method
- core workflow
- data model
- edge cases
- acceptance criteria
- technical constraints
```

Generated output:

```txt
docs/PRD.md
.needle/prd-session.json
```

Recommended flow:

```bash
needle prd
needle plan
needle code
needle review
needle reflect
```

## Install

Install globally:

```bash
npm install -g needle-cli
```

Or run without installing:

```bash
npx needle-cli init
```

Verify installation:

```bash
needle --help
```

## Quickstart

Initialize Needle inside your project:

```bash
cd your-project
needle init
```

Set your provider API key:

```bash
export OPENROUTER_API_KEY="your_openrouter_key"
```

Ask Needle to plan a change:

```bash
needle plan "How should we add Redis caching to this API?"
```

Ask Needle to implement:

```bash
needle code "Implement the Redis caching plan" --mode ask
```

Review changes:

```bash
needle review
```

Update memory:

```bash
needle reflect
```

## Commands

### `init`

Initialize Needle in the current directory.

```bash
needle init
```

Creates:

```txt
.needle/
  config.json
  MEMORY.md
  sessions/
```

### `code`

Run the main coding agent loop.

```bash
needle code "Add a health check endpoint to Express"
```

Needle can read files, write code, run commands, and iterate until the task is complete.

### `plan`

Generate an implementation plan without modifying files.

```bash
needle plan "How should we implement user avatars?"
```

### `prd`

Generate a product requirements document from a rough idea.

```bash
needle prd
```

Useful when you want to define scope before writing code.

### `review`

Review unstaged git changes.

```bash
needle review
```

Needle will inspect your diff and suggest fixes, risks, or improvements.

### `reflect`

Summarize recent sessions and update project memory.

```bash
needle reflect
```

### `models`

List available models for configured providers.

```bash
needle models
```

### `config`

View or modify local Needle configuration.

```bash
needle config list
needle config set provider 9router
needle config set model.coder high
```

### `sessions`

Manage previous sessions.

```bash
needle sessions list
needle sessions resume <session_id>
```

## Providers

Needle supports multiple AI providers through environment variables and local config.

### 9Router

9Router acts as a gateway for multiple upstream providers. The 9Router dashboard manages upstream provider authentication, so Needle only needs your gateway configuration.

Base URL examples:

```txt
http://localhost:20128/v1
http://your-host:20128/v1
```

Model examples:

```txt
low
medium
high
free
```

Setup:

```bash
needle config set provider 9router
needle config set providers.9router.baseUrl http://localhost:20128/v1
needle config set model.coder low

export NINE_ROUTER_API_KEY="your_9router_gateway_key"
```

If you run a local trusted 9Router gateway, auth may be disabled depending on your gateway configuration.

### OpenRouter

```bash
export OPENROUTER_API_KEY="your_openrouter_key"

needle config set provider openrouter
```

### OpenAI-compatible APIs

```bash
export OPENAI_API_KEY="your_openai_key"
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

You can also use compatible local endpoints such as LM Studio, Ollama-compatible gateways, or custom OpenAI-compatible APIs.

### Gemini

```bash
export GEMINI_API_KEY="your_gemini_key"

needle config set provider gemini
```

### DeepSeek

```bash
export DEEPSEEK_API_KEY="your_deepseek_key"

needle config set provider deepseek
```

Use a specific model:

```bash
needle code "Fix the build script" --model "deepseek/deepseek-coder"
```

## Memory workflow

Needle learns about your project over time.

```txt
.needle/MEMORY.md
.needle/sessions/runs.jsonl
```

Recommended workflow:

```bash
needle code "Implement feature X"
needle review
needle reflect
```

Memory is useful for:

- project architecture
- coding conventions
- preferred libraries
- known constraints
- recurring bugs
- important decisions
- previous implementation context

## Safety model

Needle can execute shell commands and modify files. You stay in control through permission modes.

```bash
needle code "Refactor the API routes" --mode ask
```

Modes:

```txt
ask      confirm before commands and file writes
auto     run safe actions automatically
dry-run  print intended actions without applying them
```

Needle should always make risky actions visible.

Examples of risky actions:

- deleting files
- installing packages
- running migrations
- modifying lockfiles
- executing unknown scripts
- pushing to git remotes
- touching environment files

## Example workflows

### Fix a bug

```bash
needle code "Fix the failing login test" --mode ask
needle review
npm test
needle reflect
```

### Plan before coding

```bash
needle plan "Add GitHub OAuth login"
needle code "Implement the GitHub OAuth plan"
needle review
```

### Start from a rough idea

```bash
needle prd
needle plan
needle code
```

### Review your own changes

```bash
git diff
needle review
```

## Project structure

Recommended project files:

```txt
your-project/
  .needle/
    config.json
    MEMORY.md
    sessions/
  docs/
    PRD.md
  src/
  package.json
```

Recommended repo branding assets:

```txt
assets/
  needle-icon.png
  needle-wordmark.png
  needle-hero.png
  needle-terminal.png
```

Use the hero at the top of this README:

```html
<img
  src="assets/needle-hero.png"
  alt="Needle - terminal-first AI coding agent"
  width="100%"
/>
```

## Configuration

Example `.needle/config.json`:

```json
{
  "provider": "openrouter",
  "model": {
    "coder": "high",
    "planner": "medium",
    "reviewer": "medium"
  },
  "memory": {
    "enabled": true,
    "path": ".needle/MEMORY.md"
  },
  "safety": {
    "mode": "ask",
    "redactSecrets": true
  }
}
```

## Development

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/needle.git
cd needle
```

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Link locally:

```bash
npm link
needle --help
```

## Roadmap

Needle is still early. The current focus is making the terminal coding loop reliable and practical.

- [x] Core agent loop
- [x] Multi-provider configuration
- [x] Project memory
- [x] Session history
- [x] Built-in file and shell tools
- [x] Permission modes
- [ ] PRD mode
- [ ] Better terminal UI
- [ ] Git-aware patch approval
- [ ] Usage and cost tracking
- [ ] Multi-provider fallback
- [ ] Custom tool plugins
- [ ] Background agents
- [ ] Multi-agent collaboration
- [ ] VS Code extension
- [ ] Stable v1 release

## Status

Needle is currently in beta.

It is usable for terminal dogfooding, but APIs, config shape, and command behavior may change before v1.0.

Use it on real projects, but review changes carefully.

## Contributing

Contributions are welcome.

Good first areas:

- improve CLI UX
- add provider adapters
- improve tool safety
- improve project scanning
- improve PRD mode
- write tests
- improve docs
- test Needle on real repositories

Before opening a large PR, please create an issue or discussion first so the direction stays aligned.

## License

MIT License.

See [LICENSE](LICENSE) for details.
