# Meta-Analysis MVP — User Stories

This backlog turns the PRD into small, testable slices. The implementation order follows the dependency order, not necessarily priority.

## Foundation

- [x] **US-01 — Local setup:** As a contributor, I can install dependencies, copy an environment template, create the MySQL table, and start the service with `npm start`.
- [x] **US-02 — Safe configuration:** As a developer, I receive clear startup errors when required environment variables are invalid or missing.
- [x] **US-03 — Durable run record:** As a developer, I can inspect one MySQL row to see the original input, message history, context, attempts, pending action, and terminal result.

## HTTP workflow

- [x] **US-04 — Submit work:** As a learner, I can `POST /runs` with interview turns and a hypothesis canvas and immediately receive a `202` plus a run ID.
- [x] **US-05 — Inspect progress:** As a learner, I can poll `GET /runs/:id` to see status, attempts, steps, artifact, or error.
- [x] **US-06 — Validate input:** As an API caller, I receive a concise `400` response for malformed transcript or canvas data.

## Agent orchestration

- [x] **US-07 — Visible agent choice:** As a learner, I can read explicit, strict function-tool schemas and see one model-selected tool per orchestration turn.
- [x] **US-08 — Durable tool sequence:** As a learner, I can reconstruct the Responses API history from persisted model output and `function_call_output` items.
- [x] **US-09 — Phase analysis:** As a learner, I can see each analysis phase run as a separate structured-output Responses call.
- [x] **US-10 — Deterministic checks:** As a learner, I can distinguish schema-constrained model output from plain-JavaScript domain validation.
- [x] **US-11 — Model-directed retry:** As a learner, I can see validator issues returned to the agent as retry hints while the runtime owns hard caps.
- [x] **US-12 — Terminal result:** As an API caller, a valid workflow finalizes a structured artifact; an unrecoverable workflow stores an abort reason.

## Reliability and limits

- [x] **US-13 — Write-ahead execution:** As a learner, the chosen call ID, tool name, and arguments are committed before any tool runs.
- [x] **US-14 — Restart recovery:** As a learner, restarting the process re-adopts stale running rows and resumes a saved pending action before asking the agent again.
- [x] **US-15 — Idempotent replay:** As a learner, replaying an already completed phase call reuses its stored result, and finalization is idempotent.
- [x] **US-16 — Hard limits:** As an operator, phase attempts and orchestration steps cannot exceed configured limits.
- [x] **US-17 — Observable lifecycle:** As an operator, structured logs identify the run, step, tool, and concise lifecycle event without exposing transcript content or credentials.

## Verification and documentation

- [x] **US-18 — Focused tests:** As a contributor, I can run Vitest coverage for validators, limits, and recovery behavior without calling OpenAI.
- [x] **US-19 — Guided reading:** As a contributor, the README explains setup, an end-to-end example, recovery semantics, and the recommended code-reading order.

## Acceptance map

| PRD success criterion | Stories |
|---|---|
| Configure, start, create a run | US-01 through US-06 |
| Successful structured artifact | US-07 through US-12 |
| Crash and restart continuation | US-13 through US-15 |
| Invalid output and bounded retries | US-10, US-11, US-16 |
| Inspectable lifecycle | US-03, US-08, US-17 |
| Easy contributor understanding | US-18, US-19 |
