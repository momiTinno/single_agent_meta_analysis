# Meta-Analysis MVP

A small Node.js teaching demo of raw OpenAI Responses API tool calling, a custom orchestration loop, deterministic validation, and MySQL-backed durable resume. There is intentionally no SDK, agent framework, ORM, or queue.

## Quick start

1. Install Node.js 20+ and MySQL 8+.
2. Run `npm install`, then copy `.env.example` to `.env` and set the OpenAI key plus MySQL credentials.
3. Create the database/user shown in the PRD, then apply `mysql -u meta_analysis -p meta_analysis_mvp < sql/001_create_runs.sql`.
4. Start with `npm start`.
5. Submit a run with the curl example in `META_ANALYSIS_MVP_PRD.md`, then poll `GET /runs/<runId>`.

Run `npm test` for deterministic validators, runtime limit guards, and recovery semantics. Tests never call OpenAI.

## The lifecycle

`POST /runs` saves the initial run row and starts the loop without waiting. Every turn first persists the complete model `response.output` and a `pending_action`; only then is the selected tool executed. Its `function_call_output`, updated context, and step count are committed together. On boot, stale `running` rows are adopted; a pending action is replayed before another agent decision is requested.

Recovery is at-least-once for external phase calls: a crash after a phase response arrives but before it is committed can cause the phase API call to be repeated. It is not exactly-once.

## Reading guide

Start with `sql/001_create_runs.sql`, then `src/agent.js`, `src/toolSchemas.js`, `src/runStore.js`, a phase and validator, `src/recovery.js`, and finally `index.js`. The user-story backlog is in `USER_STORIES.md`.
