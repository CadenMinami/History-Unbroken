export const repairRequirementLabels: Record<string, string> = {
  "case-version": "Reopen the current case version",
  "evidence-inspection": "Inspect every pinned record",
  "comparison-prerequisites": "Inspect the records behind each finding",
  "anomaly-decision-evidence": "Support each anomaly decision with a comparison",
  comparisons: "Complete all three source comparisons",
  "anomaly-diagnosis": "Identify the best-fit anomaly and eliminate both alternatives",
  "evidence-groups": "Pin all five required historical records",
  "historical-lineages": "Use at least three independent historical lineages",
  "condition-count": "Select at least two broader conditions",
  "required-condition-categories": "Select one background condition",
  "supporting-condition-category": "Select one journey, geographic, or civic condition",
  "causal-nodes": "Place every step from recognition through detention",
  "causal-edges": "Connect the complete supported mechanism",
  "causal-edge-endpoints": "Restore the endpoints of every connected link",
  "limited-consequence": "Choose the bounded historical consequence",
  uncertainty: "Acknowledge both limits on what the evidence proves",
  "case-brief-submission": "Submit the assembled Case Brief",
};

export function describeRepairRequirement(requirementId: string): string {
  return repairRequirementLabels[requirementId] ?? "Complete the remaining validated requirement";
}
