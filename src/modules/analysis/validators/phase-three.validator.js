import { buildAnalysisReport } from "../analysis-report.service.js";
const validImportance = (value) => Number.isInteger(value) && value >= 1 && value <= 5;
export function validatePhase3(output, input, ctx) {
  const issues = [];
  const analysis = output?.analysis;
  const knownHypotheses = new Set(Object.keys(input.bmc));
  const expectedSections = new Set(
    Object.values(buildAnalysisReport(ctx.phase1.output, ctx.phase2.output).keyInsights)
      .flat()
      .concat(buildAnalysisReport(ctx.phase1.output, ctx.phase2.output).metaInsights)
      .map((item) => item.sectionId)
  );
  const turns = new Map(input.turns.map((turn) => [turn.turn, turn]));
  if (!Array.isArray(analysis)) issues.push("analysis must be an array");
  for (const [index, item] of (analysis || []).entries()) {
    if (!expectedSections.has(item.sectionId)) issues.push(`analysis[${index}].sectionId is unknown`);
    if (!item?.parentInsightTitle?.trim() || !item?.parentInsightAnalysis?.trim())
      issues.push(`analysis[${index}] requires parent insight text`);
    if (!validImportance(item.importance)) issues.push(`analysis[${index}].importance must be an integer from 1 to 5`);
    for (const link of item.linkedHypotheses || [])
      if (!knownHypotheses.has(link.hypothesisId)) issues.push(`unknown hypothesis: ${link.hypothesisId}`);
    for (const [childIndex, child] of (item.childInsights || []).entries()) {
      const turn = turns.get(child.turn);
      const sentenceKeys = Object.keys(turn?.sentences || {}).map(Number);
      if (!turn) issues.push(`analysis[${index}].childInsights[${childIndex}].turn is unknown`);
      else if (
        !Number.isInteger(child.sentenceStart) ||
        !Number.isInteger(child.sentenceEnd) ||
        child.sentenceStart > child.sentenceEnd ||
        !sentenceKeys.includes(child.sentenceStart) ||
        !sentenceKeys.includes(child.sentenceEnd)
      )
        issues.push(`analysis[${index}].childInsights[${childIndex}] has invalid sentence coordinates`);
      if (!validImportance(child.importance))
        issues.push(`analysis[${index}].childInsights[${childIndex}].importance must be an integer from 1 to 5`);
      for (const link of child.linkedHypotheses || [])
        if (!knownHypotheses.has(link.hypothesisId)) issues.push(`unknown hypothesis: ${link.hypothesisId}`);
    }
  }
  return { ok: issues.length === 0, issues };
}
