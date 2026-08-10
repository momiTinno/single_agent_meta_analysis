# Meta-Analysis MVP

A small Node.js teaching demo of raw OpenAI Responses API tool calling, a custom orchestration loop, deterministic validation, and MySQL-backed durable resume. There is intentionally no SDK, agent framework, ORM, or queue.

## Quick start

1. Install Node.js 20+ and MySQL 8+.
2. Run `npm install`, then copy `.env.example` to `.env` and set the OpenAI key plus MySQL credentials.
3. Create the database/user shown in the PRD, then apply `mysql -u meta_analysis -p meta_analysis_mvp < src/db/mysql/migrations/001-create-runs.sql`.
4. Start with `npm start`.
5. Submit and poll a run:

```bash
curl -X POST http://localhost:3000/runs \
  -H 'content-type: application/json' \
  -d '{"turns":[{"turn":1,"speaker":"user","sentences":{"0":"I shop weekly.","1":"Price matters most."}}],"bmc":{"h0":"Urban shoppers","h1":"Price is the primary driver"}}'

curl http://localhost:3000/runs/<runId>
```

Run `npm test` for deterministic validators, a complete mocked orchestration, runtime limit guards, and recovery semantics. Tests never call OpenAI or MySQL.

## The lifecycle

`POST /runs` saves the initial run row and starts the loop without waiting. Every turn first persists the complete model `response.output` and a `pending_action`; only then is the selected tool executed. Its `function_call_output`, updated context, and step count are committed together. On boot, stale `running` rows are adopted; a pending action is replayed before another agent decision is requested.

Recovery is at-least-once for external phase calls: a crash after a phase response arrives but before it is committed can cause the phase API call to be repeated. It is not exactly-once.

## Reading guide

## Module layout

`src/config` contains startup configuration; `src/db/mysql` contains the direct MySQL connection and migration; `src/modules/runs` owns the HTTP and persistence lifecycle; `src/modules/agent` exposes the agent contracts; `src/modules/analysis` owns phase calls and validators; `src/modules/openai` owns raw API transport; and `src/orchestration` owns the durable agent loop and terminals.

Start with `src/db/mysql/migrations/001-create-runs.sql`, then `src/orchestration/agent-loop.js`, `src/modules/agent/schemas/tool.schemas.js`, `src/modules/runs/services/run-db.service.js`, a phase and validator, `src/modules/runs/services/run-recovery.service.js`, and finally `src/index.js`. The user-story backlog is in `USER_STORIES.md`.
