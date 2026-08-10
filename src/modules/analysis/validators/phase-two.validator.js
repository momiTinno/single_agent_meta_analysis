export function validatePhase2(output, input) {
  const issues = []; const known = new Set(Object.keys(input.bmc));
  if (!Array.isArray(output?.hypotheses) || output.hypotheses.length === 0) issues.push("hypotheses must contain at least one item");
  for (const item of output?.hypotheses || []) if (!known.has(item.hypothesisId)) issues.push(`unknown hypothesis: ${item.hypothesisId}`);
  return { ok: issues.length === 0, issues };
}
