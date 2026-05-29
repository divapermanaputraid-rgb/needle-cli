# FungiCode Config Draft

## Project Config

Location:

```txt
.fungi/config.json
```

Example:

```json
{
  "version": 1,
  "permissionMode": "ask",
  "provider": {
    "default": "9router"
  },
  "models": {
    "fast": "9router/deepseek-chat",
    "smart": "openai/gpt-4.1",
    "coder": "deepseek/deepseek-coder",
    "planner": "gemini/gemini-pro",
    "reviewer": "openai/gpt-4.1-mini"
  },
  "commands": {
    "test": "pnpm test",
    "lint": "pnpm lint",
    "typecheck": "pnpm typecheck"
  },
  "memory": {
    "enabled": true,
    "path": ".fungi/MEMORY.md"
  }
}
```

## Global Config

Location:

```txt
~/.fungi/config.json
```

Example:

```json
{
  "version": 1,
  "apiKeys": {
    "9router": "env:NINE_ROUTER_API_KEY",
    "openai": "env:OPENAI_API_KEY",
    "gemini": "env:GEMINI_API_KEY",
    "deepseek": "env:DEEPSEEK_API_KEY"
  },
  "defaults": {
    "permissionMode": "ask"
  }
}
```

API keys should use environment variable references by default. Avoid writing raw secrets into project files.
