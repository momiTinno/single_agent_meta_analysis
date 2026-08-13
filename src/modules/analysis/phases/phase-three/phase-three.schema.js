const link = {
  type: "object",
  properties: { hypothesisId: { type: "string" }, supportStatus: { type: "string" } },
  required: ["hypothesisId", "supportStatus"],
  additionalProperties: false,
};
const child = {
  type: "object",
  properties: {
    turn: { type: "integer" },
    sentenceStart: { type: "integer" },
    sentenceEnd: { type: "integer" },
    analysis: { type: "string" },
    importance: { type: "integer" },
    linkedHypotheses: { type: "array", items: link },
  },
  required: ["turn", "sentenceStart", "sentenceEnd", "analysis", "importance", "linkedHypotheses"],
  additionalProperties: false,
};
export const PHASE_THREE_SCHEMA = {
  type: "object",
  properties: {
    analysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sectionId: { type: "string" },
          parentInsightTitle: { type: "string" },
          parentInsightAnalysis: { type: "string" },
          importance: { type: "integer" },
          linkedHypotheses: { type: "array", items: link },
          childInsights: { type: "array", items: child },
        },
        required: [
          "sectionId",
          "parentInsightTitle",
          "parentInsightAnalysis",
          "importance",
          "linkedHypotheses",
          "childInsights",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["analysis"],
  additionalProperties: false,
};
