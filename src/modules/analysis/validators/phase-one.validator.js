export function validatePhase1(output) {
  const issues = [];
  if (!Array.isArray(output?.findings) || output.findings.length === 0) issues.push("findings must contain at least one item");
  for (const [index, finding] of (output?.findings || []).entries()) {
    if (typeof finding.claim !== "string" || !finding.claim.trim()) issues.push(`findings[${index}].claim is required`);
    if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) issues.push(`findings[${index}].evidence is required`);
  }
  return { ok: issues.length === 0, issues };
}
