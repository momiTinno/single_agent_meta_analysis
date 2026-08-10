import { describe, expect, it } from "vitest";
import { runAgent } from "../src/agent.js";

const context = () => ({ phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null });
function memoryStore(run) {
  return {
    load: async () => run,
    savePending: async (_id, value) => Object.assign(run, value),
    completeAction: async (_id, value) => Object.assign(run, value, { status: value.status ?? "running", pendingAction: null, step: run.step + 1 }),
    fail: async (_id, error) => Object.assign(run, { status: "failed", error })
  };
}
const selection = (name, callId) => ({ output: [{ type: "function_call", name, call_id: callId, arguments: name.startsWith("run_") ? '{"retryHint":null}' : "{}" }] });

describe("agent workflow", () => {
  it("persists every selected call and reaches a structured artifact", async () => {
    const run = { runId: "workflow", status: "running", input: { turns: [{ turn: 1, speaker: "user", sentences: { 0: "Price matters" } }], bmc: { h0: "Price hypothesis" } }, messages: [], ctx: context(), attempts: { phase1: 0, phase2: 0, phase3: 0 }, pendingAction: null, step: 0, artifact: null, error: null };
    const sequence = ["run_phase_1", "validate_phase_1", "run_phase_2", "validate_phase_2", "run_phase_3", "validate_phase_3", "finalize"];
    const calls = [];
    await runAgent(run.runId, {
      store: memoryStore(run),
      callOpenAI: async (request) => { calls.push(request); return selection(sequence.shift(), `call-${calls.length}`); },
      phaseRunners: {
        phase1: async () => ({ findings: [{ claim: "Price matters", evidence: ["turn 1 sentence 0"] }] }),
        phase2: async () => ({ hypotheses: [{ hypothesisId: "h0", assessment: "supported" }] }),
        phase3: async () => ({ summary: "Price drives decisions.", evidence: "One interview statement.", recommendations: "Test price messaging." })
      }
    });
    expect(run.status).toBe("success"); expect(run.step).toBe(7); expect(run.artifact.analysis.summary).toContain("Price");
    expect(run.messages.filter((item) => item.type === "function_call_output")).toHaveLength(7);
    expect(calls.every((request) => request.tool_choice === "required" && request.parallel_tool_calls === false)).toBe(true);
  });
  it("returns deterministic validation issues as the retry hint", async () => {
    const run = { runId: "retry", status: "running", input: { turns: [], bmc: { h0: "x" } }, messages: [], ctx: context(), attempts: { phase1: 0, phase2: 0, phase3: 0 }, pendingAction: null, step: 0 };
    const names = ["run_phase_1", "validate_phase_1", "run_phase_1", "abort_non_retryable"]; let call = 0; const hints = []; const requests = [];
    await runAgent("retry", { store: memoryStore(run), callOpenAI: async (request) => {
      requests.push(request);
      const name = names[call]; call += 1;
      const argumentsJson = name === "run_phase_1" ? (call === 1 ? '{"retryHint":null}' : '{"retryHint":"findings[0].evidence is required"}') : name === "abort_non_retryable" ? '{"reason":"test complete"}' : "{}";
      return { output: [{ type: "function_call", name, call_id: `c${call}`, arguments: argumentsJson }] };
    }, phaseRunners: { phase1: async ({ retryHint }) => { hints.push(retryHint); return { findings: [{ claim: "x", evidence: [] }] }; }, phase2: async () => {}, phase3: async () => {} } });
    expect(hints).toEqual([null, "findings[0].evidence is required"]);
    expect(JSON.stringify(requests[2].input)).toContain("findings[0].evidence is required");
  });
});
