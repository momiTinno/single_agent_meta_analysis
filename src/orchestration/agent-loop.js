import { config } from "../config/app.config.js";
import { callGemini as defaultCallGemini, candidateContent, usageMetadata } from "../modules/gemini/gemini.client.js";
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
const functionOutput = (name, callId, payload) => ({
  role: "user",
  parts: [{ functionResponse: { name, id: callId, response: payload } }],
});
const known = new Set(TOOL_SCHEMAS.map((tool) => tool.name));
const atLevel = (log, level) => (typeof log[level] === "function" ? log[level].bind(log) : log.info.bind(log));
const phaseOutputSummary = (phase, output) => {
  if (phase === "phase1")
    return {
      themeCount: output?.thematicAnalysis?.themes?.length || 0,
      themeTitles: (output?.thematicAnalysis?.themes || []).map((theme) => theme.themeTitle).slice(0, 5),
      explicitInsightCount: output?.keyInsights?.explicit?.length || 0,
      implicitInsightCount: output?.keyInsights?.implicit?.length || 0,
      executiveSummaryLength: output?.executiveSummary?.length || 0,
    };
  if (phase === "phase2")
    return {
      metaInsightCount: output?.metaInsights?.length || 0,
      strategicImplicationLengths: (output?.metaInsights || [])
        .map((insight) => insight.strategicImplication?.length || 0)
        .slice(0, 5),
    };
  return {
    analysisCount: output?.analysis?.length || 0,
    sectionIds: (output?.analysis || []).map((item) => item.sectionId).slice(0, 10),
    childInsightCount: (output?.analysis || []).reduce((count, item) => count + (item.childInsights?.length || 0), 0),
  };
};
const trackedGeminiCall =
  ({ run, store, log, callGemini, callType, phaseName = null, phaseAttempt = null }) =>
  async (request) => {
    const startedAt = Date.now();
    const response = await callGemini(request);
    const tokens = usageMetadata(response);
    if (typeof store.recordModelCall !== "function") return response;
    const totals = await store.recordModelCall({
      callId: createUuid(),
      runId: run.runId,
      workflowStep: run.step,
      callType,
      phaseName,
      phaseAttempt,
      model: request.model,
      ...tokens,
      durationMs: Date.now() - startedAt,
    });
    log.info(
      {
        event: "gemini_usage_recorded",
        callType,
        phase: phaseName || undefined,
        attempt: phaseAttempt || undefined,
        model: request.model,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        thoughtsTokens: tokens.thoughtsTokens,
        totalTokens: tokens.totalTokens,
        usageAvailable: tokens.usageAvailable,
        runTotalTokens: totals.totalTokens,
        runModelCallCount: totals.modelCallCount,
      },
      "gemini_usage_recorded"
    );
    return response;
  };

export async function runAgent(runId, deps = {}) {
  const store = deps.store || defaultStore;
  const callGemini = deps.callGemini || defaultCallGemini;
  const phaseRunners = deps.phaseRunners || { phase1: runPhase1, phase2: runPhase2, phase3: runPhase3 };
  const log = deps.logger || runLogger(runId);
  const startedAt = Date.now();
  log.info({ event: "run_agent_started" }, "run_agent_started");
  while (true) {
    let run = await store.load(runId);
    if (!run || run.status !== "running") return run?.status;
    if (run.step >= config.MAX_STEPS)
      return finish(store, run, { code: "MAX_STEPS", message: "Maximum orchestration steps reached" }, log, startedAt);
    let action = run.pendingAction;
    if (!action) {
      log.info(
        { event: "agent_request_started", step: run.step, messageCount: run.messages.length, attempts: run.attempts },
        "agent_request_started"
      );
      const response = await trackedGeminiCall({
        run,
        store,
        log,
        callGemini,
        callType: "agent_decision",
      })({
        model: config.GEMINI_AGENT_MODEL,
        systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
        contents: run.messages,
        tools: [{ functionDeclarations: TOOL_SCHEMAS }],
        toolConfig: { functionCallingConfig: { mode: "ANY" } },
      });
      const content = candidateContent(response);
      const calls = (content.parts || []).filter((part) => part.functionCall).map((part) => part.functionCall);
      if (calls.length !== 1)
        return finish(
          store,
          run,
          { code: "INVALID_TOOL_RESPONSE", message: "Expected exactly one function_call" },
          log,
          startedAt
        );
      const call = calls[0];
      if (!known.has(call.name))
        return finish(store, run, { code: "UNKNOWN_TOOL", message: call.name }, log, startedAt);
      if (call.args !== undefined && (call.args === null || typeof call.args !== "object" || Array.isArray(call.args)))
        return finish(store, run, { code: "INVALID_TOOL_ARGS", message: call.name }, log, startedAt);
      action = { callId: call.id || createUuid(), name: call.name, args: call.args || {} };
      const phase = phaseFor(action.name);
      const attempts = { ...run.attempts };
      if (phase) attempts[phase] += 1;
      log.info(
        {
          event: "agent_action_selected",
          step: run.step,
          tool: action.name,
          callId: action.callId,
          phase,
          attempt: phase ? attempts[phase] : undefined,
          hasRetryHint: Boolean(action.args.retryHint),
        },
        "agent_action_selected"
      );
      await store.savePending(runId, { messages: [...run.messages, content], pendingAction: action, attempts });
      log.info(
        { event: "pending_action_saved", step: run.step, tool: action.name, callId: action.callId },
        "pending_action_saved"
      );
      run = await store.load(runId);
    }
    const actionStartedAt = Date.now();
    const result = await execute(run, action, phaseRunners, callGemini, log, store);
    const messages = [...run.messages, functionOutput(action.name, action.callId, result.payload)];
    await store.completeAction(runId, {
      messages,
      ctx: result.ctx || run.ctx,
      status: result.status,
      artifact: result.artifact,
      error: result.error,
    });
    const durationMs = Date.now() - actionStartedAt;
    log.info(
      {
        event: "tool_result_saved",
        step: run.step,
        tool: action.name,
        callId: action.callId,
        durationMs,
        status: result.status || "running",
      },
      "tool_result_saved"
    );
    if (result.status && result.status !== "running") {
      const terminalLog = result.status === "success" ? atLevel(log, "info") : atLevel(log, "warn");
      terminalLog(
        {
          event: "run_terminal",
          status: result.status,
          step: run.step + 1,
          durationMs: Date.now() - startedAt,
          error: result.error?.code || undefined,
          usage: (await store.load(runId))?.usage,
        },
        "run_terminal"
      );
      return result.status;
    }
  }
}

async function execute(run, action, phaseRunners, callGemini, log, store) {
  const phase = phaseFor(action.name);
  const ctx = structuredClone(run.ctx);
  if (phase) {
    if (run.attempts[phase] > config.MAX_ATTEMPTS_PER_PHASE) {
      atLevel(log, "warn")(
        {
          event: "phase_attempt_limit_reached",
          phase,
          attempt: run.attempts[phase],
          maxAttempts: config.MAX_ATTEMPTS_PER_PHASE,
        },
        "phase_attempt_limit_reached"
      );
      return { payload: { ok: false, issues: ["phase attempt cap reached"] } };
    }
    if (ctx[phase]?.callId === action.callId) {
      log.info({ event: "phase_result_reused", phase, attempt: run.attempts[phase] }, "phase_result_reused");
      return { payload: { ok: true, reused: true } };
    }
    const phaseStartedAt = Date.now();
    log.info(
      {
        event: "phase_execution_started",
        phase,
        attempt: run.attempts[phase],
        turnCount: run.input.turns.length,
        hypothesisCount: Object.keys(run.input.bmc).length,
        hasRetryHint: Boolean(action.args.retryHint),
      },
      "phase_execution_started"
    );
    const output = await phaseRunners[phase]({
      input: run.input,
      ctx,
      retryHint: action.args.retryHint,
      callGemini: trackedGeminiCall({
        run,
        store,
        log,
        callGemini,
        callType: "phase_execution",
        phaseName: phase,
        phaseAttempt: run.attempts[phase],
      }),
    });
    ctx[phase] = { callId: action.callId, attempt: run.attempts[phase], output };
    log.info(
      {
        event: "phase_execution_completed",
        phase,
        attempt: run.attempts[phase],
        durationMs: Date.now() - phaseStartedAt,
      },
      "phase_execution_completed"
    );
    if (config.LOG_AGENT_OUTPUT)
      log.info(
        {
          event: "phase_output_summary",
          phase,
          attempt: run.attempts[phase],
          summary: phaseOutputSummary(phase, output),
        },
        "phase_output_summary"
      );
    return { ctx, payload: { ok: true, summary: `${phase} stored` } };
  }
  if (action.name.startsWith("validate_phase_")) {
    const number = action.name.at(-1);
    const key = `phase${number}`;
    const validator = { 1: validatePhase1, 2: validatePhase2, 3: validatePhase3 }[number];
    const validation = validator(ctx[key]?.output, run.input, ctx);
    ctx[`${key}Validation`] = validation;
    const validationLog = validation.ok ? atLevel(log, "info") : atLevel(log, "warn");
    validationLog(
      {
        event: validation.ok ? "phase_validation_passed" : "phase_validation_failed",
        phase: key,
        issueCount: validation.issues.length,
        issues: validation.ok ? undefined : validation.issues,
      },
      validation.ok ? "phase_validation_passed" : "phase_validation_failed"
    );
    return { ctx, payload: validation };
  }
  if (action.name === "finalize") {
    const valid = ["phase1", "phase2", "phase3"].every((key) => ctx[`${key}Validation`]?.ok);
    if (!valid) {
      atLevel(log, "warn")(
        {
          event: "finalization_blocked",
          validationStates: Object.fromEntries(
            ["phase1", "phase2", "phase3"].map((key) => [key, ctx[`${key}Validation`]?.ok || false])
          ),
        },
        "finalization_blocked"
      );
      return { payload: { ok: false, issues: ["cannot finalize before all validations pass"] } };
    }
    const artifact = finalize(run);
    log.info(
      {
        event: "artifact_finalized",
        themeCount: artifact.thematicAnalysis.themes.length,
        metaInsightCount: artifact.metaInsights.length,
        analysisCount: artifact.analysis.length,
      },
      "artifact_finalized"
    );
    return { status: "success", artifact, ctx, payload: { ok: true, summary: "run finalized" } };
  }
  if (action.name === "abort_non_retryable") {
    const error = abort(run, action.args.reason);
    atLevel(log, "warn")(
      { event: "run_abort_requested", reason: error.reason || error.message || undefined },
      "run_abort_requested"
    );
    return { status: "aborted", error, ctx, payload: { ok: true, summary: "run aborted" } };
  }
  return { status: "failed", error: { code: "UNKNOWN_TOOL", message: action.name }, ctx, payload: { ok: false } };
}

async function finish(store, run, error, log, startedAt) {
  await store.fail(run.runId, error);
  log.error({ event: "run_failed", error: error.code, durationMs: Date.now() - startedAt }, "run_failed");
  return "failed";
}
