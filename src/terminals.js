export function finalize(run) {
  if (run.artifact) return run.artifact;
  return { phase1: run.ctx.phase1.output, phase2: run.ctx.phase2.output, analysis: run.ctx.phase3.output, completedAt: new Date().toISOString() };
}
export function abort(run, reason) { return run.error || { code: "NON_RETRYABLE_ABORT", reason }; }
