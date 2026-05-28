# Sprint 1 Report: Foundation & Providers

## Status
**Completed**

## Goals Achieved
1. **Config Schema & Loader**
   - Implemented Zod-based config schema in `src/config/schema.ts` defining providers, models, and permission modes.
   - Built config loader and persistence logic in `src/config/loader.ts` to read/write `.fungi/config.json`.
   - Setup initial permission policies in `src/permissions/policy.ts`.

2. **Provider Types & Router**
   - Defined core Provider interfaces (`Provider`, `ProviderId`, `ChatRequest`, `ChatResponse`) in `src/providers/types.js` (and `.ts`).
   - Implemented a unified `ProviderRouter` in `src/providers/router.ts` capable of routing completion requests to the correct active provider based on ID.

3. **Provider Adapters**
   - Implemented OpenAI-Compatible provider (`src/providers/openai-compatible.ts`) using standard fetch interface to map models to generic API endpoints.
   - Added initial stubs for Gemini, DeepSeek, and Nine-Router providers ensuring they conform to the new `Provider` interface.

4. **CLI Commands Updates**
   - Updated `fungi init` (`src/cli/commands/init.ts`) to gracefully handle initialization logic without overwriting existing configs unless forced.
   - Built `fungi config get/set` (`src/cli/commands/config.ts`) commands allowing users to query and mutate config JSON via dot notation (e.g., `models.coder`).
   - Implemented `fungi models` (`src/cli/commands/models.ts`) to query the `ProviderRouter` for available provider capabilities based on local environment vars (API keys).
   - Updated `fungi chat` (`src/cli/commands/chat.ts`) to actually load config and instantiate the `ProviderRouter` to route basic prompts (though completion methods are pending actual wire-up in some providers in Sprint 2).

## Next Steps (Sprint 2)
- Fully implement real API fetch calls inside `GeminiProvider`, `DeepSeekProvider`, and `NineRouterProvider`
- Implement Tool schema and capability mapping
- Start building Agent Loops for Plan/Code modes