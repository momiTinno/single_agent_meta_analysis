import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_ONE_SCHEMA } from "./phase-one.schema.js";
import { PHASE_ONE_PROMPT } from "./phase-one.prompt.js";
export const runPhase1 = (args) => runStructuredPhase({ number: 1, schema: PHASE_ONE_SCHEMA, systemPrompt: PHASE_ONE_PROMPT, ...args });
