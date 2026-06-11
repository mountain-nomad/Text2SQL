# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Text2SQL converts natural language questions into SQL, executes them against a PostgreSQL database, and returns results with an AI-generated summary and follow-up questions. The backend is a FastAPI service driving a **LangGraph** state-machine workflow; the frontend is a React/Vite SPA. The LLM is OpenAI (default `gpt-4o-mini`/`gpt-4o`) via the `openai` SDK.

## Commands

Backend uses `uv` (lockfile `uv.lock`) for local dev but `poetry` inside Docker (both read `pyproject.toml`).

```bash
# One-time DB setup: installs/starts PostgreSQL, restores db_backup/causal_inference.zip,
# prints the .env block to copy. Loads the causal_inference schema.
./scripts/setup.sh

# Run both servers (backend :8090, frontend :8080). Activates ./venv, installs frontend deps if missing.
# Logs -> /tmp/backend.log and /tmp/frontend.log
./scripts/start.sh

# Backend only
./venv/bin/python -m src          # or: python -m src

# Frontend only (from frontend/)
npm run dev        # dev server on :8080
npm run build      # builds to ../static (served by FastAPI in prod)
npm run lint       # eslint
```

There is **no backend test suite or linter configured** — `pyproject.toml` declares no test/lint deps. The `src/notebook/*.ipynb` files are exploratory prototypes, not part of the runtime.

## Architecture

### Request flow
`React → POST /api/text2sql_lg_code/text2sql → view.py → Text2SQLService.process_query → WorkflowOrchestrator.invoke (LangGraph)`

The endpoint is **async but the workflow is synchronous**: `view.py` runs `service.process_query` in a `ThreadPoolExecutor` to avoid blocking the event loop. Keep workflow/node code synchronous.

### The LangGraph workflow (`workflow_orchestrator.py`)
This is the heart of the system. Nodes and edges:
- `get_metadata` → fans out to **both** `get_followup_que` (terminal) and `generate_sql` (parallel branches).
- `generate_sql` → `validate_sql_query` → conditional `_check_condition`:
  - unanswerable → `handle_unanswerable` (returns empty data + guidance message)
  - valid OR `retry_count >= max_iterations` → `execute_sql` (note: proceeds even if still invalid once retries are exhausted)
  - otherwise → loops back to `generate_sql`
- `execute_sql` → fans out to `generate_summary` and `generate_chart` (both terminal). **`generate_chart` is a placeholder** that returns `{"chart": ""}`; charts are actually rendered client-side from `data`.

State is a `TypedDict` (`Text2SQLState` in `models.py`, `total=False`). Nodes return partial dicts that LangGraph merges. `retry_count` is incremented inside `_validate_sql_query`, not in the conditional edge.

### Workflow node components (`src/app/services/text2sql_lg_service/`)
Each node delegates to a single-responsibility class: `metadata_loader.py`, `sql_generator.py`, `sql_validator.py`, `sql_executor.py`, `summary_generator.py`, `followup_generator.py`. SQL generation/validation/summary all call `llm_client.py` (OpenAI). DB access goes through `database_client.py` (psycopg2 connection pool, 1–5 connections).

### Singletons & lifecycle
`Text2SQLService` and `DatabaseClient` are module-global singletons created in `src/core/lifetime.py` on FastAPI startup and torn down on shutdown. Access them via `get_text2sql_service()` / `get_database_client()` — never instantiate directly in request handlers. The DB pool is closed on shutdown.

Lifecycle is wired through a **lifespan async context manager** (`LifecycleManager.lifespan`), passed to `FastAPI(lifespan=...)` in `core/application.py`. Startup logic runs before `yield`, shutdown in the `finally` after it. (The older `add_event_handler("startup"/"shutdown")` API was removed in Starlette ≥1.x and will `AttributeError` — do not reintroduce it.)

### Schema metadata
The LLM is grounded on a static schema description at `src/notebook/metadata/causal_inference_metadata.txt` (loaded by `MetadataLoader`, default filename hardcoded there). The DB schema is `causal_inference`; SQL is schema-qualified and capped at `LIMIT 1000` to prevent cross-schema access and runaway queries. If the DB schema changes, this metadata file must be regenerated.

### Errors
Custom exception hierarchy in `exceptions.py` (`Text2SQLException` base, plus `WorkflowException`, `DatabaseConnectionException`, `LLMClientException`, `MetadataLoadException`), each carrying `error_code`/`status_code`/`details`. `view.py` maps them to HTTP responses; `src/middleware/exception.py` is a global catch-all. Preserve `error_code` when adding new failure paths.

### Settings (`src/settings.py`)
Pydantic-settings split into `ApplicationSettings`, `DatabaseSettings`, `OpenAISettings`, `RedisSettings`, aggregated in `Settings` and exported as the `settings` singleton. Env vars use the `POSTGRES_DB_*`, `OPENAI_*`, `REDIS_*` prefixes (see `.env.example`); `model_post_init` provides non-prefixed fallbacks. Redis is configured but not currently used by the workflow.

### Frontend (`frontend/src/`)
React 18 + Vite + TypeScript, shadcn/ui (Radix + Tailwind) under `components/ui/`, TanStack Query for server state. `services/api.ts` is the typed API client (POSTs `{input_text, max_iterations, metadata_path}`); `hooks/useText2SQL.ts` wraps it. Pages: `Login`, `Home`, `Results`, `NotFound`. In production the SPA is built to `../static` and served by FastAPI via a catch-all route in `core/application.py` (so client-side routing works on refresh).

Every `components/ui/*` file imports the `cn` class-merge helper from `@/lib/utils` (`src/lib/utils.ts`, `clsx` + `tailwind-merge`). The `@` alias resolves to `src/` (set in both `vite.config.ts` and `tsconfig*.json`). If a `Failed to resolve import "@/lib/utils"` error appears, that file is missing — recreate it rather than rewriting every import.

## Gotchas

- **Vite proxy target**: `frontend/vite.config.ts` proxies `/api` to `http://localhost:8090` to match the backend (`PORT` in `.env`, and `start.sh`). If you change the backend `PORT`, update this target too — a mismatch surfaces in the browser as a 500 (`ECONNREFUSED` in `/tmp/frontend.log`) while the backend on its real port answers fine.
- **Dockerfile** expects `poetry.lock` (Poetry) while local dev uses `uv.lock`; it `EXPOSE`s 8000 and builds the frontend in a separate stage into `/app/src/static`.
- All API calls use **relative `/api/...` paths** so they work in both dev (proxied) and prod (same origin) — don't hardcode hosts.

## Security note

`.env.example` currently contains a real-looking `OPENAI_API_KEY` value (and `.env` exists locally). Do not commit live secrets; `.env.example` should hold only placeholders.
