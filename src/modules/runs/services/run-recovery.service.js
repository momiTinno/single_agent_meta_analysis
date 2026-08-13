import { config } from "../../../config/app.config.js";
import { runAgent } from "../../../orchestration/agent-loop.js";
import { logger } from "../../../utils/logger.util.js";
export async function recoverRuns(store, deps = {}) {
  const runs = await store.staleRunning(config.RECOVERY_STALE_SECONDS);
  await Promise.all(
    runs.map((run) => {
      (deps.logger || logger).info({ runId: run.runId }, "recovery_run_adopted");
      return (deps.runAgent || runAgent)(run.runId, { store, ...deps });
    })
  );
  return runs.length;
}
