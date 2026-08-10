import { createUuid } from "../../utils/uuid.util.js";
const emptyContext = () => ({ phase1: null, phase1Validation: null, phase2: null, phase2Validation: null, phase3: null, phase3Validation: null });
export async function createRun(input, { store, runAgent, logger }) {
  const runId = createUuid();
  await store.create({ runId, input, messages: [{ role: "user", content: JSON.stringify(input) }], ctx: emptyContext(), attempts: { phase1: 0, phase2: 0, phase3: 0 } });
  logger.info({ runId }, "run_created");
  void runAgent(runId, { store }).catch((error) => logger.error({ runId, err: error.message }, "agent_crashed"));
  return runId;
}
