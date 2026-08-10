import { describe, expect, it } from "vitest";
import { validatePhase1 } from "../../src/modules/analysis/validators/phase-one.validator.js";
import { validatePhase2 } from "../../src/modules/analysis/validators/phase-two.validator.js";
import { validatePhase3 } from "../../src/modules/analysis/validators/phase-three.validator.js";
describe("validators", () => {
  it("rejects phase 1 missing evidence and accepts valid output", () => { expect(validatePhase1({ findings: [{ claim: "x", evidence: [] }] }).ok).toBe(false); expect(validatePhase1({ findings: [{ claim: "x", evidence: ["0"] }] }).ok).toBe(true); });
  it("rejects unknown hypotheses", () => expect(validatePhase2({ hypotheses: [{ hypothesisId: "other", assessment: "x" }] }, { bmc: { h0: "x" } }).ok).toBe(false));
  it("requires phase 3 sections", () => { expect(validatePhase3({ summary: "x", evidence: "x" }).ok).toBe(false); expect(validatePhase3({ summary: "x", evidence: "x", recommendations: "x" }).ok).toBe(true); });
});
