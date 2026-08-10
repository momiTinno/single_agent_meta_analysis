import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_ONE_SCHEMA } from "./phase-one.schema.js";
import { PHASE_ONE_PROMPT } from "./phase-one.prompt.js";
export const runPhase1 = ({ input, ...args }) => runStructuredPhase({ number: 1, input: { json_transcript: JSON.stringify(input.turns) }, schema: PHASE_ONE_SCHEMA, systemPrompt: PHASE_ONE_PROMPT, ...args });
