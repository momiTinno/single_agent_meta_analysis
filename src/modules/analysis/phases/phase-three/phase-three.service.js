import { runStructuredPhase } from "../structured-phase.service.js";
import { PHASE_THREE_SCHEMA } from "./phase-three.schema.js";
import { PHASE_THREE_PROMPT } from "./phase-three.prompt.js";
import { buildAnalysisReport } from "../../analysis-report.service.js";
export const runPhase3 = ({ input, ctx, ...args }) =>
  runStructuredPhase({
    number: 3,
    input: {
      Analysis_Report: JSON.stringify(buildAnalysisReport(ctx.phase1.output, ctx.phase2.output)),
      BMC_JSON: JSON.stringify(input.bmc),
    },
    schema: PHASE_THREE_SCHEMA,
    systemPrompt: PHASE_THREE_PROMPT,
    ...args,
  });
