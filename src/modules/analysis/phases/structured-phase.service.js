import { config } from "../../../config/app.config.js";
import { callGemini, outputText } from "../../gemini/gemini.client.js";

export async function runStructuredPhase({ number, input, retryHint, schema: suppliedSchema, systemPrompt, callGemini: caller = callGemini }) {
  const schema = suppliedSchema || (number === 1
    ? { type: "object", properties: { findings: { type: "array", items: { type: "object", properties: { claim: { type: "string" }, evidence: { type: "array", items: { type: "string" } } }, required: ["claim", "evidence"], additionalProperties: false } } }, required: ["findings"], additionalProperties: false }
    : number === 2
      ? { type: "object", properties: { hypotheses: { type: "array", items: { type: "object", properties: { hypothesisId: { type: "string" }, assessment: { type: "string" } }, required: ["hypothesisId", "assessment"], additionalProperties: false } } }, required: ["hypotheses"], additionalProperties: false }
      : { type: "object", properties: { summary: { type: "string" }, evidence: { type: "string" }, recommendations: { type: "string" } }, required: ["summary", "evidence", "recommendations"], additionalProperties: false });
  const response = await caller({ model: config.GEMINI_PHASE_MODEL, systemInstruction: { parts: [{ text: systemPrompt || `Perform phase ${number}. Return only the requested JSON.` }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify({ input, retryHint }) }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema } });
  return JSON.parse(outputText(response));
}
