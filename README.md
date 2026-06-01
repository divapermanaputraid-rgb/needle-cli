<div align="center">
  <img src="assets/needle-wordmark.png" alt="Needle Logo" width="300" />

  <p><strong>Open-source, multi-provider AI coding CLI</strong></p>
</div>

Needle is an autonomous, terminal-native AI coding assistant. It integrates directly with your codebase, reads your files, executes commands, and writes code.

Designed to be lightweight and fast, Needle brings the power of Agentic AI to your command line, supporting multiple model providers.

## Features

- **Agentic Loop**: Think -> Plan -> Act loop for reliable code generation and problem-solving.
- **Project Memory**: Maintains persistent project context at `.needle/MEMORY.md`.
- **Session History**: Resumable conversation sessions.
- **Multi-Provider**: Use OpenRouter, 9Router, OpenAI-compatible APIs, DeepSeek, or Gemini.
- **Built-in Tools**: File read/write, git integration, semantic search, and shell execution.
- **Safety First**: Configurable permission modes (`ask`, `auto`, `dry-run`) to keep you in control.

## Install

```bash
# Install globally
npm install -g needle-cli

# Or use without installing
npx needle-cli init
```

## Quickstart

1. Initialize Needle in your project:
   ```bash
   needle init
   ```

2. Set your API key (e.g., for OpenRouter):
   ```bash
   export OPENROUTER_API_KEY="your_openrouter_key"
   ```

3. Ask Needle to do something:
   ```bash
   needle code "Refactor the authentication middleware"
   ```

## Provider Setup

Needle supports multiple AI providers. Configure them via environment variables or `.env`.

### 9Router

9Router acts as a gateway. The 9Router dashboard manages your upstream provider auth. Needle does not need your upstream provider keys directly.

Use your 9Router gateway/endpoint API key for `NINE_ROUTER_API_KEY`. If running a local trusted 9Router, auth may be disabled depending on your gateway config.

Base URL examples:
* local: `http://localhost:20128/v1`
* remote: `http://your-host:20128/v1`

Model examples:
* `low`
* `medium`
* `high`
* `free`
(or any combo name copied from the 9Router dashboard)

Example Setup:
```bash
needle config set provider 9router
needle config set providers.9router.baseUrl http://localhost:20128/v1
needle config set model.coder low
export NINE_ROUTER_API_KEY="your_9router_gateway_key"
```

### OpenRouter
```bash
export OPENROUTER_API_KEY="your_openrouter_key"
```

### OpenAI-Compatible
```bash
export OPENAI_API_KEY="your_openai_key"
export OPENAI_BASE_URL="https://api.openai.com/v1" # Customize for local models (e.g., LMStudio, Ollama)
```

### Gemini
```bash
export GEMINI_API_KEY="your_gemini_key"
```

### DeepSeek
```bash
export DEEPSEEK_API_KEY="your_deepseek_key"
```

You can select a specific model when running commands using the `--model` flag:
```bash
needle code "Fix the build script" --model "deepseek/deepseek-coder"
```

## Commands

### `init`
Initialize Needle in the current directory. Creates `.needle/` configuration folder.
```bash
needle init
```

### `config`
View or modify your current configuration.
```bash
needle config list
```

### `models`
List available models for your configured providers.
```bash
needle models
```

### `plan`
Draft an execution plan without modifying files.
```bash
needle plan "How should we implement user avatars?"
```

### `code`
The main agent loop. Needle will read files, think, and write code to accomplish the task.
```bash
needle code "Add a health check endpoint to Express"
```

### `review`
Review unstaged git changes and suggest improvements or catch bugs.
```bash
needle review
```

### `sessions`
Manage past interaction sessions.
```bash
needle sessions list
needle sessions resume <session_id>
```

### `reflect`
Analyze recent sessions and update the project memory document.
```bash
needle reflect
```

## Memory Workflow

Needle learns about your project over time.
- Context is stored in `.needle/MEMORY.md`.
- Sessions are logged in `.needle/sessions/runs.jsonl`.
- Run `needle reflect` periodically to distill session learnings into the core memory document.

## Safety Model & Permissions

Needle can execute shell commands and modify files. To prevent unintended actions, Needle supports different permission modes:

- `--mode ask` (Default): Prompts for confirmation before executing commands or writing files.
- `--mode auto`: Executes safe commands automatically. Prompts for destructive actions.
- `--mode dry-run`: Simulates actions and prints them to the console without applying them.

Example:
```bash
needle code "Update dependencies" --mode auto
```

## Built-in Tools

Needle equips the LLM with a comprehensive toolset:
- `file-read` / `file-write` / `file-edit`: File system manipulation.
- `shell`: Command line execution.
- `glob` / `grep`: Codebase exploration.
- `git-diff`: Code review context.

## Example Workflow

```bash
# 1. Initialize
needle init

# 2. Ask for a plan
needle plan "I want to add Redis caching to our API"

# 3. Execute the plan
needle code "Implement the Redis caching plan we just discussed" --mode ask

# 4. Review the changes
needle review

# 5. Commit
git commit -m "feat: add Redis caching"

# 6. Update project memory
needle reflect
```

## Status & Roadmap

Needle is currently in early active development.

- [x] Core agent loop
- [x] Multi-provider support
- [x] Basic memory system
- [ ] VSCode Extension
- [ ] Custom tool plugins
- [ ] Multi-agent collaboration

## License

MIT License. See [LICENSE](LICENSE) for details.