import { describe, expect, it } from "vitest";
import { validatePhase1 } from "../../src/modules/analysis/validators/phase-one.validator.js";
import { validatePhase2 } from "../../src/modules/analysis/validators/phase-two.validator.js";
import { validatePhase3 } from "../../src/modules/analysis/validators/phase-three.validator.js";
describe("validators", () => {
  const phaseOne = { thematicAnalysis: { themes: [{ themeTitle: "Price", summary: "Price matters" }] }, keyInsights: { explicit: [{ insightSummary: "Price matters", sectionId: "explicit_1" }], implicit: [] }, executiveSummary: "Price drives purchases." };
  it("requires themes, insights, and an executive summary", () => { expect(validatePhase1({}).ok).toBe(false); expect(validatePhase1(phaseOne).ok).toBe(true); });
  it("requires complete meta insights", () => { expect(validatePhase2({ metaInsights: [{ shortExplanation: "x" }] }).ok).toBe(false); expect(validatePhase2({ metaInsights: [{ shortExplanation: "x", strategicImplication: "y", suggestedReframe: "z" }] }).ok).toBe(true); });
  it("rejects invalid phase 3 coordinates and hypotheses", () => { const input = { turns: [{ turn: 1, sentences: { 0: "x" } }], bmc: { h0: "x" } }; const ctx = { phase1: { output: phaseOne }, phase2: { output: { metaInsights: [] } } }; expect(validatePhase3({ analysis: [{ sectionId: "explicit_1", parentInsightTitle: "x", parentInsightAnalysis: "x", importance: 3, linkedHypotheses: [{ hypothesisId: "bad", supportStatus: "supports" }], childInsights: [{ turn: 1, sentenceStart: 0, sentenceEnd: 1, analysis: "x", importance: 2, linkedHypotheses: [] }] }] }, input, ctx).ok).toBe(false); });
});
