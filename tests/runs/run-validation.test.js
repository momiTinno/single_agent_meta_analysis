import { describe, expect, it } from "vitest";
import { validateRunInput } from "../../src/modules/runs/middleware/run-validation.middleware.js";

describe("run validation middleware", () => {
  it("attaches valid input for the run controller", () => {
    const request = { body: { turns: [{ turn: 1, speaker: "user", sentences: { 0: "Hello" } }], bmc: { h0: "Test" } } };
    let nextError;
    validateRunInput(request, {}, (error) => {
      nextError = error;
    });
    expect(nextError).toBeUndefined();
    expect(request.validatedInput.bmc.h0).toBe("Test");
  });
  it("passes malformed input to the error middleware", () => {
    let nextError;
    validateRunInput({ body: { turns: [] } }, {}, (error) => {
      nextError = error;
    });
    expect(nextError.name).toBe("ZodError");
  });
});
