const withSectionIds = (items, prefix) =>
  (items || []).map((item, index) => ({ ...item, sectionId: item.sectionId || `${prefix}_${index + 1}` }));
export function buildAnalysisReport(phaseOneOutput, phaseTwoOutput) {
  return {
    keyInsights: {
      explicit: withSectionIds(phaseOneOutput.keyInsights.explicit, "explicit"),
      implicit: withSectionIds(phaseOneOutput.keyInsights.implicit, "implicit"),
    },
    metaInsights: withSectionIds(phaseTwoOutput.metaInsights, "meta"),
    executiveSummary: phaseOneOutput.executiveSummary,
  };
}
