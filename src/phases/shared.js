import { config } from "../config.js";
import { callOpenAI, outputText } from "../openai.js";

export async function runStructuredPhase({ number, input, retryHint, callOpenAI: caller = callOpenAI }) {
  const schema = number === 1
    ? { type: "object", properties: { findings: { type: "array", items: { type: "object", properties: { claim: { type: "string" }, evidence: { type: "array", items: { type: "string" } } }, required: ["claim", "evidence"], additionalProperties: false } } }, required: ["findings"], additionalProperties: false }
    : number === 2
      ? { type: "object", properties: { hypotheses: { type: "array", items: { type: "object", properties: { hypothesisId: { type: "string" }, assessment: { type: "string" } }, required: ["hypothesisId", "assessment"], additionalProperties: false } } }, required: ["hypotheses"], additionalProperties: false }
      : { type: "object", properties: { summary: { type: "string" }, evidence: { type: "string" }, recommendations: { type: "string" } }, required: ["summary", "evidence", "recommendations"], additionalProperties: false };
  const response = await caller({ model: config.OPENAI_PHASE_MODEL, input: [{ role: "system", content: `Perform phase ${number}. Return only the requested JSON.` }, { role: "user", content: JSON.stringify({ input, retryHint }) }], text: { format: { type: "json_schema", name: `phase_${number}_output`, strict: true, schema } } });
  return JSON.parse(outputText(response));
}
