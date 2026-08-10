import { describe, expect, it } from "vitest";
import { runAgent } from "../src/agent.js";

describe("recovery semantics", () => {
  it("resumes a pending action and uses its original call ID", async () => {
    const run = { runId: "r", status: "running", input: { turns: [], bmc: {} }, messages: [], ctx: { phase1: { callId: "saved", attempt: 1, output: { findings: [] } }, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null }, attempts: { phase1: 1, phase2: 0, phase3: 0 }, pendingAction: { callId: "saved", name: "run_phase_1", args: { retryHint: null } }, step: 0 };
    let saved; const store = { load: async () => run, completeAction: async (_id, value) => { saved = value; run.status = "success"; } };
    await runAgent("r", { store, callOpenAI: async () => { throw new Error("agent must not be called"); }, phaseRunners: {} });
    expect(saved.messages.at(-1).call_id).toBe("saved"); expect(JSON.parse(saved.messages.at(-1).output).reused).toBe(true);
  });
});
