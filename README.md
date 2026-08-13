# Meta-Analysis MVP

A small Node.js teaching demo of raw Gemini `generateContent` REST API function calling, a custom orchestration loop, deterministic validation, MySQL-backed durable resume, and Amazon SQS processing. There is intentionally no Gemini SDK, agent framework, or ORM.

## Quick start

1. Install Node.js 20+ and MySQL 8+.
2. Run `npm install`, then copy `.env.example` to `.env` and set the Gemini API key, AWS region/SQS queue URL, and MySQL credentials. AWS authentication follows the standard AWS SDK credential chain (for example, `aws configure` locally or an IAM role in AWS).
3. Create your MySQL database/user, then apply both migrations in order:

```bash
mysql -u <user> -p <database> < src/db/mysql/migrations/001-create-runs.sql
mysql -u <user> -p <database> < src/db/mysql/migrations/002-add-model-usage.sql
```
4. Start the API and background worker in separate terminals:

```bash
# Terminal 1 — HTTP API logs
npm start

# Terminal 2 — SQS, agent, and phase-processing logs
npm run start:worker
```

5. Submit and poll a run:

```bash
curl -X POST http://localhost:3000/runs \
  -H 'content-type: application/json' \
  -d '{"turns":[{"turn":1,"speaker":"user","sentences":{"0":"I shop weekly.","1":"Price matters most."}}],"bmc":{"h0":"Urban shoppers","h1":"Price is the primary driver"}}'

curl http://localhost:3000/runs/<runId>

# Retrieve aggregate and per-Gemini-call token usage:
curl http://localhost:3000/runs/<runId>/usage

# After status is "success", retrieve only the final analysis artifact:
curl http://localhost:3000/runs/<runId>/artifact
```

Run `npm test` for deterministic validators, a complete mocked orchestration, runtime limit guards, and recovery semantics. Tests never call Gemini, MySQL, or SQS.

### Local SQS with LocalStack

To emulate SQS locally instead of using an AWS account, run `npm run localstack:up`, then run `bash scripts/create-local-sqs.sh`. Set the printed `SQS_QUEUE_URL`, `SQS_ENDPOINT_URL=http://localhost:4566`, and dummy `AWS_ACCESS_KEY_ID=test` / `AWS_SECRET_ACCESS_KEY=test` in `.env`. The app uses the same AWS SDK code path against LocalStack. Use `npm run localstack:down` to stop it.

## SQS worker and logs

Create an SQS **Standard** queue and attach a dead-letter queue with a redrive policy of three receives. Set `SQS_QUEUE_URL` to the main queue URL. `npm start` runs only Express, while `npm run start:worker` runs one SQS worker. The worker long-polls for 20 seconds, starts each message with five minutes of visibility, and extends visibility every two minutes while a run is active. `npm run start:worker` enables readable colored terminal logs and safe phase-output summaries; use `npm run start:worker:json` for raw JSON logs.

The worker logs the agent's observable choices and phase summaries, not private model reasoning. It excludes transcripts, prompts, API keys, and full-model-response content. Important events are `sqs_message_received`, `agent_action_selected`, `gemini_usage_recorded`, `phase_execution_started`, `phase_execution_completed`, `phase_output_summary`, `phase_validation_passed`, `phase_validation_failed`, `phase_attempt_limit_reached`, `artifact_finalized`, `run_terminal`, and `sqs_message_deleted`. A `gemini_usage_recorded` event includes prompt, response, thought, and total tokens plus the cumulative run total. Failure logs include validator `issues`, phase attempt counts, durations, and terminal status.

### Optional LangSmith tracing

Installations run normally without LangSmith. To trace one complete agent run and its nested Gemini decision/phase calls, deterministic validations, and finalization, add the following to `.env` and restart the worker:

```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=<your LangSmith API key>
LANGSMITH_PROJECT=meta-analysis-mvp
```

This integration is trace-only: it does not change orchestration, retries, SQS, persistence, or token accounting. It is configured for full debugging visibility: LangSmith records transcripts, BMC data, prompts, agent messages, raw Gemini requests/responses, phase outputs, validation results, and the final artifact. API keys are not sent. Enable it only in a LangSmith project approved to hold this interview data.

## Postman API checks

Import [`postman/Meta-Analysis-MVP.postman_collection.json`](postman/Meta-Analysis-MVP.postman_collection.json) into Postman. It covers every implemented HTTP endpoint:

- `POST /runs`: successful submission and invalid-input rejection.
- `GET /runs/:runId`: status retrieval.
- `GET /runs/:runId/usage`: aggregate and per-call Gemini token usage.
- `GET /runs/:runId/artifact`: accepts `409` while processing and validates the completed artifact when it returns `200`.
- `GET /runs/:unknownId`: not-found response.

Run **Create run — happy path**, then repeatedly run **Get run status** until it is `success`, and finally run **Get final artifact**. The collection stores the returned `runId` automatically. Keep Terminal 2 open to observe each SQS and agent-processing event.

## The lifecycle

`POST /runs` saves the initial run row and queues its ID without waiting. The standalone SQS worker receives the ID and runs the loop. Every turn first persists the complete Gemini model content and a `pending_action`; only then is the selected tool executed. Its Gemini `functionResponse`, updated context, and step count are committed together. When the worker starts, stale `running` rows are adopted; a pending action is replayed before another agent decision is requested.

Recovery is at-least-once for external phase calls: a crash after a phase response arrives but before it is committed can cause the phase API call to be repeated. It is not exactly-once.

## Reading guide

## Module layout

`src/config` contains startup configuration; `src/db/mysql` contains the direct MySQL connection and migration; `src/modules/runs` owns the HTTP and persistence lifecycle; `src/modules/queue` owns SQS transport and the worker loop; `src/modules/agent` exposes the agent contracts; `src/modules/analysis` owns phase calls and validators; `src/modules/gemini` owns raw API transport; and `src/orchestration` owns the durable agent loop and terminals.

Start with `src/db/mysql/migrations/001-create-runs.sql` and `002-add-model-usage.sql`, then `src/orchestration/agent-loop.js`, `src/modules/agent/schemas/tool.schemas.js`, `src/modules/runs/services/run-db.service.js`, a phase and validator, `src/modules/runs/services/run-recovery.service.js`, and finally `src/index.js`. The user-story backlog is in `USER_STORIES.md`.
