export function validatePhase3(output) {
  const sections = ["summary", "evidence", "recommendations"];
  const issues = sections.filter((key) => typeof output?.[key] !== "string" || !output[key].trim()).map((key) => `${key} is required`);
  return { ok: issues.length === 0, issues };
}
