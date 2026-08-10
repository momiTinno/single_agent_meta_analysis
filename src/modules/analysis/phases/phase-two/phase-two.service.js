import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_TWO_SCHEMA } from "./phase-two.schema.js";
import { PHASE_TWO_PROMPT } from "./phase-two.prompt.js";
export const runPhase2 = ({ input, ctx, ...args }) => runStructuredPhase({ number: 2, input: { json_transcript: JSON.stringify(input.turns), thematic_analysis: JSON.stringify(ctx.phase1.output.thematicAnalysis) }, schema: PHASE_TWO_SCHEMA, systemPrompt: PHASE_TWO_PROMPT, ...args });
