import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_TWO_SCHEMA } from "./phase-two.schema.js";
import { PHASE_TWO_PROMPT } from "./phase-two.prompt.js";
export const runPhase2 = (args) => runStructuredPhase({ number: 2, schema: PHASE_TWO_SCHEMA, systemPrompt: PHASE_TWO_PROMPT, ...args });
