// Gemini function declarations use its Schema subset, not JSON Schema.
// In particular, type is a single enum value and additionalProperties is unsupported.
const retryParameters = { type: "OBJECT", properties: { retryHint: { type: "STRING", nullable: true } } };
const noParameters = { type: "OBJECT", properties: {}, required: [] };
const tool = (name, description, parameters) => ({ name, description, parameters });
export const TOOL_SCHEMAS = [
  tool("run_phase_1", "Run phase 1 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_1", "Deterministically validate phase 1.", noParameters),
  tool("run_phase_2", "Run phase 2 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_2", "Deterministically validate phase 2.", noParameters),
  tool("run_phase_3", "Run phase 3 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_3", "Deterministically validate phase 3.", noParameters),
  tool("finalize", "Create the final artifact only after every validation passes.", noParameters),
  tool("abort_non_retryable", "Stop when the workflow cannot safely continue.", {
    type: "OBJECT",
    properties: { reason: { type: "STRING" } },
    required: ["reason"],
  }),
];
