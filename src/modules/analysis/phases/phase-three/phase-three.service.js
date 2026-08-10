import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_THREE_SCHEMA } from "./phase-three.schema.js";
import { PHASE_THREE_PROMPT } from "./phase-three.prompt.js";
export const runPhase3 = (args) => runStructuredPhase({ number: 3, schema: PHASE_THREE_SCHEMA, systemPrompt: PHASE_THREE_PROMPT, ...args });
