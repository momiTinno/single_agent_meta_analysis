import { describe, expect, it } from "vitest";
import { runAgent } from "../../src/orchestration/agent-loop.js";

const context = () => ({ phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null });
function memoryStore(run) {
  return {
    load: async () => run,
    savePending: async (_id, value) => Object.assign(run, value),
    completeAction: async (_id, value) => Object.assign(run, value, { status: value.status ?? "running", pendingAction: null, step: run.step + 1 }),
    fail: async (_id, error) => Object.assign(run, { status: "failed", error })
  };
}
const selection = (name, callId, args = name.startsWith("run_") ? { retryHint: null } : {}) => ({ candidates: [{ content: { role: "model", parts: [{ functionCall: { name, id: callId, args } }] } }] });

describe("agent workflow", () => {
  it("persists every selected call and reaches a structured artifact", async () => {
    const run = { runId: "workflow", status: "running", input: { turns: [{ turn: 1, speaker: "user", sentences: { 0: "Price matters" } }], bmc: { h0: "Price hypothesis" } }, messages: [], ctx: context(), attempts: { phase1: 0, phase2: 0, phase3: 0 }, pendingAction: null, step: 0, artifact: null, error: null };
    const sequence = ["run_phase_1", "validate_phase_1", "run_phase_2", "validate_phase_2", "run_phase_3", "validate_phase_3", "finalize"];
    const calls = [];
    await runAgent(run.runId, {
      store: memoryStore(run),
      callGemini: async (request) => { calls.push(request); const name = sequence.shift(); return calls.length === 1 ? { candidates: [{ content: { role: "model", parts: [{ functionCall: { name } }] } }] } : selection(name, `call-${calls.length}`); },
      phaseRunners: {
        phase1: async () => ({ thematicAnalysis: { themes: [{ themeTitle: "Price", summary: "Price matters" }] }, keyInsights: { explicit: [{ insightSummary: "Price matters", sectionId: "explicit_1" }], implicit: [] }, executiveSummary: "Price drives decisions." }),
        phase2: async () => ({ metaInsights: [{ shortExplanation: "Price first", strategicImplication: "Speed alone is weak", suggestedReframe: "Value" }] }),
        phase3: async () => ({ analysis: [{ sectionId: "explicit_1", parentInsightTitle: "Price", parentInsightAnalysis: "Price matters", importance: 3, linkedHypotheses: [{ hypothesisId: "h0", supportStatus: "supports" }], childInsights: [{ turn: 1, sentenceStart: 0, sentenceEnd: 0, analysis: "Direct evidence", importance: 2, linkedHypotheses: [] }] }] })
      }
    });
    expect(run.status).toBe("success"); expect(run.step).toBe(7); expect(run.artifact.analysis[0].parentInsightTitle).toContain("Price");
    expect(run.messages.filter((item) => item.parts?.[0]?.functionResponse)).toHaveLength(7);
    expect(calls.every((request) => request.toolConfig.functionCallingConfig.mode === "ANY")).toBe(true);
  });
  it("returns deterministic validation issues as the retry hint", async () => {
    const run = { runId: "retry", status: "running", input: { turns: [], bmc: { h0: "x" } }, messages: [], ctx: context(), attempts: { phase1: 0, phase2: 0, phase3: 0 }, pendingAction: null, step: 0 };
    const names = ["run_phase_1", "validate_phase_1", "run_phase_1", "abort_non_retryable"]; let call = 0; const hints = []; const requests = []; const events = [];
    const logger = { info: (fields) => events.push(fields), warn: (fields) => events.push(fields), error: (fields) => events.push(fields) };
    await runAgent("retry", { store: memoryStore(run), logger, callGemini: async (request) => {
      requests.push(request);
      const name = names[call]; call += 1;
      const args = name === "run_phase_1" ? (call === 1 ? { retryHint: null } : { retryHint: "findings[0].evidence is required" }) : name === "abort_non_retryable" ? { reason: "test complete" } : {};
      return selection(name, `c${call}`, args);
    }, phaseRunners: { phase1: async ({ retryHint }) => { hints.push(retryHint); return { thematicAnalysis: { themes: [] }, keyInsights: { explicit: [], implicit: [] }, executiveSummary: "x" }; }, phase2: async () => {}, phase3: async () => {} } });
    expect(hints).toEqual([null, "findings[0].evidence is required"]);
    expect(JSON.stringify(requests[2].contents)).toContain("thematicAnalysis.themes must contain at least one theme");
    expect(events).toContainEqual(expect.objectContaining({ event: "phase_validation_failed", phase: "phase1", issues: ["thematicAnalysis.themes must contain at least one theme"] }));
    expect(events).toContainEqual(expect.objectContaining({ event: "run_terminal", status: "aborted" }));
  });
});
