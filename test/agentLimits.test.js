import { describe, expect, it } from "vitest";
import { config } from "../src/config.js";
import { runAgent } from "../src/agent.js";

function memoryRun(overrides = {}) {
  return { runId: "r1", status: "running", input: { turns: [{ turn: 1, speaker: "u", sentences: { 0: "x" } }], bmc: { h0: "x" } }, messages: [], ctx: { phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null }, attempts: { phase1: 0, phase2: 0, phase3: 0 }, pendingAction: null, step: 0, artifact: null, error: null, ...overrides };
}
function storeFor(run) { return { load: async () => run, savePending: async (_id, value) => Object.assign(run, value), completeAction: async (_id, value) => Object.assign(run, value, { status: value.status ?? "running", pendingAction: null, step: run.step + 1 }), fail: async (_id, error) => Object.assign(run, { status: "failed", error }) }; }
describe("agent limits", () => {
  it("fails before step twenty-one", async () => { const run = memoryRun({ step: config.MAX_STEPS }); await runAgent("r1", { store: storeFor(run) }); expect(run.status).toBe("failed"); expect(run.error.code).toBe("MAX_STEPS"); });
  it("does not execute a fourth phase attempt", async () => {
    const run = memoryRun({ attempts: { phase1: config.MAX_ATTEMPTS_PER_PHASE, phase2: 0, phase3: 0 } }); let calls = 0;
    await runAgent("r1", { store: storeFor(run), callOpenAI: async () => ({ output: [{ type: "function_call", call_id: "c", name: "run_phase_1", arguments: "{\"retryHint\":null}" }] }), phaseRunners: { phase1: async () => { calls += 1; }, phase2: async () => {}, phase3: async () => {} } });
    expect(calls).toBe(0);
  });
});
