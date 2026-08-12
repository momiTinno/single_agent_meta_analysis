import { createUuid } from "../../utils/uuid.util.js";
const emptyContext = () => ({
  phase1: null,
  phase1Validation: null,
  phase2: null,
  phase2Validation: null,
  phase3: null,
  phase3Validation: null,
});
export async function createRun(input, { store, queue, logger }) {
  const runId = createUuid();
  await store.create({
    runId,
    input,
    messages: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
    ctx: emptyContext(),
    attempts: { phase1: 0, phase2: 0, phase3: 0 },
  });
  logger.info({ runId }, "run_created");
  await queue.enqueueRun(runId);
  logger.info({ runId }, "sqs_job_enqueued");
  return runId;
}
