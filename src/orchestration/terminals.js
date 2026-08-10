export function finalize(run) {
  if (run.artifact) return run.artifact;
  return { thematicAnalysis: run.ctx.phase1.output.thematicAnalysis, keyInsights: run.ctx.phase1.output.keyInsights, executiveSummary: run.ctx.phase1.output.executiveSummary, metaInsights: run.ctx.phase2.output.metaInsights, analysis: run.ctx.phase3.output.analysis, completedAt: new Date().toISOString() };
}
export function abort(run, reason) { return run.error || { code: "NON_RETRYABLE_ABORT", reason }; }
