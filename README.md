# Meta-Analysis MVP

A small Node.js teaching demo of raw Gemini `generateContent` REST API function calling, a custom orchestration loop, deterministic validation, and MySQL-backed durable resume. There is intentionally no SDK, agent framework, ORM, or queue.

## Quick start

1. Install Node.js 20+ and MySQL 8+.
2. Run `npm install`, then copy `.env.example` to `.env` and set the Gemini API key, AWS region/SQS queue URL, and MySQL credentials. AWS authentication follows the standard AWS SDK credential chain (for example, `aws configure` locally or an IAM role in AWS).
3. Create the database/user shown in the PRD, then apply `mysql -u meta_analysis -p meta_analysis_mvp < src/db/mysql/migrations/001-create-runs.sql`.
4. Start with `npm start`.
5. Submit and poll a run:

```bash
curl -X POST http://localhost:3000/runs \
  -H 'content-type: application/json' \
  -d '{"turns":[{"turn":1,"speaker":"user","sentences":{"0":"I shop weekly.","1":"Price matters most."}}],"bmc":{"h0":"Urban shoppers","h1":"Price is the primary driver"}}'

curl http://localhost:3000/runs/<runId>
```

Run `npm test` for deterministic validators, a complete mocked orchestration, runtime limit guards, and recovery semantics. Tests never call Gemini or MySQL.

## SQS worker and logs

Create an SQS **Standard** queue and attach a dead-letter queue with a redrive policy of three receives. Set `SQS_QUEUE_URL` to the main queue URL. `npm start` runs Express and one SQS worker in the same Node process, so Pino writes API, queue, and agent lifecycle events to the same terminal. The worker long-polls for 20 seconds, starts each message with five minutes of visibility, and extends visibility every two minutes while a run is active.

## The lifecycle

`POST /runs` saves the initial run row and queues its ID without waiting. The in-process SQS worker receives the ID and runs the loop. Every turn first persists the complete Gemini model content and a `pending_action`; only then is the selected tool executed. Its Gemini `functionResponse`, updated context, and step count are committed together. On boot, stale `running` rows are adopted; a pending action is replayed before another agent decision is requested.

Recovery is at-least-once for external phase calls: a crash after a phase response arrives but before it is committed can cause the phase API call to be repeated. It is not exactly-once.

## Reading guide

## Module layout

`src/config` contains startup configuration; `src/db/mysql` contains the direct MySQL connection and migration; `src/modules/runs` owns the HTTP and persistence lifecycle; `src/modules/agent` exposes the agent contracts; `src/modules/analysis` owns phase calls and validators; `src/modules/gemini` owns raw API transport; and `src/orchestration` owns the durable agent loop and terminals.

Start with `src/db/mysql/migrations/001-create-runs.sql`, then `src/orchestration/agent-loop.js`, `src/modules/agent/schemas/tool.schemas.js`, `src/modules/runs/services/run-db.service.js`, a phase and validator, `src/modules/runs/services/run-recovery.service.js`, and finally `src/index.js`. The user-story backlog is in `USER_STORIES.md`.
