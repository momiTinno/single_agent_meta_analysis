const retryParameters = { type: "object", properties: { retryHint: { type: ["string", "null"] } }, required: ["retryHint"], additionalProperties: false };
const noParameters = { type: "object", properties: {}, required: [], additionalProperties: false };
const tool = (name, description, parameters) => ({ type: "function", name, description, strict: true, parameters });
export const TOOL_SCHEMAS = [
  tool("run_phase_1", "Run phase 1 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_1", "Deterministically validate phase 1.", noParameters),
  tool("run_phase_2", "Run phase 2 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_2", "Deterministically validate phase 2.", noParameters),
  tool("run_phase_3", "Run phase 3 or retry it using validator feedback.", retryParameters),
  tool("validate_phase_3", "Deterministically validate phase 3.", noParameters),
  tool("finalize", "Create the final artifact only after every validation passes.", noParameters),
  tool("abort_non_retryable", "Stop when the workflow cannot safely continue.", { type: "object", properties: { reason: { type: "string" } }, required: ["reason"], additionalProperties: false })
];
