import { config } from "./config.js";
import { runAgent } from "./agent.js";
import { logger } from "./logger.js";
export async function recoverRuns(store, deps = {}) {
  const runs = await store.staleRunning(config.RECOVERY_STALE_SECONDS);
  await Promise.all(runs.map((run) => { (deps.logger || logger).info({ runId: run.runId }, "recovery_run_adopted"); return (deps.runAgent || runAgent)(run.runId, { store, ...deps }); }));
  return runs.length;
}
