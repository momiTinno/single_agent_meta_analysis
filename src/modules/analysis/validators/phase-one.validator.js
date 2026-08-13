export function validatePhase1(output) {
  const issues = [];
  const themes = output?.thematicAnalysis?.themes;
  if (!Array.isArray(themes) || themes.length === 0)
    issues.push("thematicAnalysis.themes must contain at least one theme");
  for (const [index, theme] of (themes || []).entries())
    for (const key of ["themeTitle", "summary"])
      if (!theme?.[key]?.trim()) issues.push(`themes[${index}].${key} is required`);
  for (const kind of ["explicit", "implicit"]) {
    const insights = output?.keyInsights?.[kind];
    if (!Array.isArray(insights)) {
      issues.push(`keyInsights.${kind} must be an array`);
      continue;
    }
    for (const [index, insight] of insights.entries())
      if (!insight?.insightSummary?.trim()) issues.push(`keyInsights.${kind}[${index}].insightSummary is required`);
  }
  if (!output?.executiveSummary?.trim()) issues.push("executiveSummary is required");
  return { ok: issues.length === 0, issues };
}
