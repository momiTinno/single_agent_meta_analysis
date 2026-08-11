import { config } from "../config/app.config.js";
import { callGemini as defaultCallGemini, candidateContent } from "../modules/gemini/gemini.client.js";
import { TOOL_SCHEMAS } from "../modules/agent/schemas/tool.schemas.js";
import { AGENT_SYSTEM_PROMPT } from "../modules/agent/agent.prompt.js";
import { runPhase1 } from "../modules/analysis/phases/phase-one/phase-one.service.js";
import { runPhase2 } from "../modules/analysis/phases/phase-two/phase-two.service.js";
import { runPhase3 } from "../modules/analysis/phases/phase-three/phase-three.service.js";
import { validatePhase1 } from "../modules/analysis/validators/phase-one.validator.js";
import { validatePhase2 } from "../modules/analysis/validators/phase-two.validator.js";
import { validatePhase3 } from "../modules/analysis/validators/phase-three.validator.js";
import { finalize, abort } from "./terminals.js";
import { runLogger } from "../utils/logger.util.js";
import { runStore as defaultStore } from "../modules/runs/services/run-db.service.js";
import { createUuid } from "../utils/uuid.util.js";

const phaseFor = (name) => ({ run_phase_1: "phase1", run_phase_2: "phase2", run_phase_3: "phase3" })[name];
const functionOutput = (name, callId, payload) => ({ role: "user", parts: [{ functionResponse: { name, id: callId, response: payload } }] });
const known = new Set(TOOL_SCHEMAS.map((tool) => tool.name));

export async function runAgent(runId, deps = {}) {
  const store = deps.store || defaultStore; const callGemini = deps.callGemini || defaultCallGemini;
  const phaseRunners = deps.phaseRunners || { phase1: runPhase1, phase2: runPhase2, phase3: runPhase3 };
  const log = deps.logger || runLogger(runId);
  while (true) {
    let run = await store.load(runId); if (!run || run.status !== "running") return;
    if (run.step >= config.MAX_STEPS) return finish(store, run, { code: "MAX_STEPS", message: "Maximum orchestration steps reached" });
    let action = run.pendingAction;
    if (!action) {
      log.info({ step: run.step }, "agent_request_started");
      const response = await callGemini({ model: config.GEMINI_AGENT_MODEL, systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] }, contents: run.messages, tools: [{ functionDeclarations: TOOL_SCHEMAS }], toolConfig: { functionCallingConfig: { mode: "ANY" } } });
      const content = candidateContent(response); const calls = (content.parts || []).filter((part) => part.functionCall).map((part) => part.functionCall);
      if (calls.length !== 1) return finish(store, run, { code: "INVALID_TOOL_RESPONSE", message: "Expected exactly one function_call" });
      const call = calls[0]; if (!known.has(call.name)) return finish(store, run, { code: "UNKNOWN_TOOL", message: call.name });
      if (call.args !== undefined && (call.args === null || typeof call.args !== "object" || Array.isArray(call.args))) return finish(store, run, { code: "INVALID_TOOL_ARGS", message: call.name });
      action = { callId: call.id || createUuid(), name: call.name, args: call.args || {} };
      const phase = phaseFor(action.name); const attempts = { ...run.attempts };
      if (phase) attempts[phase] += 1;
      await store.savePending(runId, { messages: [...run.messages, content], pendingAction: action, attempts });
      log.info({ step: run.step, tool: action.name }, "pending_action_saved"); run = await store.load(runId);
    }
    const result = await execute(run, action, phaseRunners, callGemini);
    const messages = [...run.messages, functionOutput(action.name, action.callId, result.payload)];
    await store.completeAction(runId, { messages, ctx: result.ctx || run.ctx, status: result.status, artifact: result.artifact, error: result.error });
    log.info({ step: run.step, tool: action.name }, "tool_result_saved");
    if (result.status && result.status !== "running") return;
  }
}

async function execute(run, action, phaseRunners, callGemini) {
  const phase = phaseFor(action.name); const ctx = structuredClone(run.ctx);
  if (phase) {
    if (run.attempts[phase] > config.MAX_ATTEMPTS_PER_PHASE) return { payload: { ok: false, issues: ["phase attempt cap reached"] } };
    if (ctx[phase]?.callId === action.callId) return { payload: { ok: true, reused: true } };
    const output = await phaseRunners[phase]({ input: run.input, ctx, retryHint: action.args.retryHint, callGemini });
    ctx[phase] = { callId: action.callId, attempt: run.attempts[phase], output };
    return { ctx, payload: { ok: true, summary: `${phase} stored` } };
  }
  if (action.name.startsWith("validate_phase_")) {
    const number = action.name.at(-1); const key = `phase${number}`; const validator = ({ 1: validatePhase1, 2: validatePhase2, 3: validatePhase3 })[number];
    const validation = validator(ctx[key]?.output, run.input, ctx); ctx[`${key}Validation`] = validation;
    return { ctx, payload: validation };
  }
  if (action.name === "finalize") {
    const valid = ["phase1", "phase2", "phase3"].every((key) => ctx[`${key}Validation`]?.ok);
    if (!valid) return { payload: { ok: false, issues: ["cannot finalize before all validations pass"] } };
    const artifact = finalize(run); return { status: "success", artifact, ctx, payload: { ok: true, summary: "run finalized" } };
  }
  if (action.name === "abort_non_retryable") { const error = abort(run, action.args.reason); return { status: "aborted", error, ctx, payload: { ok: true, summary: "run aborted" } }; }
  return { status: "failed", error: { code: "UNKNOWN_TOOL", message: action.name }, ctx, payload: { ok: false } };
}

async function finish(store, run, error) { await store.fail(run.runId, error); }
