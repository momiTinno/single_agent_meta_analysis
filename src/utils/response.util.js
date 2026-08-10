export const runResponse = (run) => ({ runId: run.runId, status: run.status, artifact: run.artifact, error: run.error, attempts: run.attempts, step: run.step });
