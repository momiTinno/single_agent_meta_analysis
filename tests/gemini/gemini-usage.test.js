import { describe, expect, it } from "vitest";
import { usageMetadata } from "../../src/modules/gemini/gemini.client.js";

describe("Gemini usage metadata", () => {
  it("normalizes every supported token counter", () => {
    expect(
      usageMetadata({
        usageMetadata: {
          promptTokenCount: 120,
          candidatesTokenCount: 35,
          thoughtsTokenCount: 20,
          cachedContentTokenCount: 11,
          toolUsePromptTokenCount: 5,
          totalTokenCount: 175,
        },
      })
    ).toEqual({
      inputTokens: 120,
      outputTokens: 35,
      thoughtsTokens: 20,
      cachedTokens: 11,
      toolUsePromptTokens: 5,
      totalTokens: 175,
      usageAvailable: true,
    });
  });

  it("keeps missing usage metadata explicit instead of estimating tokens", () => {
    expect(usageMetadata({})).toMatchObject({ inputTokens: 0, outputTokens: 0, totalTokens: 0, usageAvailable: false });
  });
});
