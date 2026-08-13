export function validatePhase2(output) {
  const issues = [];
  if (!Array.isArray(output?.metaInsights)) issues.push("metaInsights must be an array");
  for (const [index, insight] of (output?.metaInsights || []).entries())
    for (const key of ["shortExplanation", "strategicImplication", "suggestedReframe"])
      if (!insight?.[key]?.trim()) issues.push(`metaInsights[${index}].${key} is required`);
  return { ok: issues.length === 0, issues };
}
