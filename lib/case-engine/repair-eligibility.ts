import { containsEvery, getPinnedHistoricalLineageIds } from "./selectors";
import type { CasePackage } from "@/schemas/case-package";
import type { CaseState } from "@/schemas/case-state";

export interface RepairEligibility {
  eligible: boolean;
  missingRequirementIds: string[];
}

export function getRepairEligibility(
  casePackage: CasePackage,
  state: CaseState,
): RepairEligibility {
  const missing: string[] = [];
  const solution = casePackage.solution;

  if (
    state.caseId !== casePackage.caseId ||
    state.caseSchemaVersion !== casePackage.schemaVersion ||
    state.caseVersion !== casePackage.caseVersion
  ) {
    missing.push("case-version");
  }

  if (state.pinnedEvidenceIds.some((id) => !state.inspectedItemIds.includes(id))) {
    missing.push("evidence-inspection");
  }

  const completedFindings = casePackage.comparisonFindings.filter((finding) =>
    state.completedComparisonIds.includes(finding.id),
  );
  if (
    completedFindings.some((finding) =>
      finding.requiredItemIds.some((id) => !state.inspectedItemIds.includes(id)),
    )
  ) {
    missing.push("comparison-prerequisites");
  }

  if (
    !completedFindings.some(
      (finding) =>
        finding.result.action === "support_active_anomaly" &&
        finding.result.anomalyId === state.activeAnomalyId,
    ) ||
    state.rejectedAnomalyIds.some(
      (anomalyId) =>
        !completedFindings.some(
          (finding) =>
            finding.result.action === "reject_anomaly" &&
            finding.result.anomalyId === anomalyId,
        ),
    )
  ) {
    missing.push("anomaly-decision-evidence");
  }

  if (!containsEvery(state.completedComparisonIds, solution.requiredComparisonIds)) {
    missing.push("comparisons");
  }
  if (
    state.activeAnomalyId !== solution.activeAnomalyId ||
    !containsEvery(state.rejectedAnomalyIds, solution.rejectedAnomalyIds)
  ) {
    missing.push("anomaly-diagnosis");
  }
  if (
    !solution.requiredEvidenceGroups.every((group) =>
      containsEvery(state.pinnedEvidenceIds, group.allOf),
    )
  ) {
    missing.push("evidence-groups");
  }
  if (
    getPinnedHistoricalLineageIds(casePackage, state).length <
    solution.minimumHistoricalLineages
  ) {
    missing.push("historical-lineages");
  }

  const selectedConditions = casePackage.conditions.filter((condition) =>
    state.selectedConditionIds.includes(condition.id),
  );
  const selectedCategories = new Set(selectedConditions.map((condition) => condition.category));
  if (selectedConditions.length < solution.minimumConditions) {
    missing.push("condition-count");
  }
  if (!solution.requiredConditionCategories.every((category) => selectedCategories.has(category))) {
    missing.push("required-condition-categories");
  }
  if (!solution.requireOneConditionFrom.some((category) => selectedCategories.has(category))) {
    missing.push("supporting-condition-category");
  }
  if (!containsEvery(state.placedCausalNodeIds, solution.requiredCausalNodeIds)) {
    missing.push("causal-nodes");
  }
  if (!containsEvery(state.connectedCausalEdgeIds, solution.requiredCausalEdgeIds)) {
    missing.push("causal-edges");
  }
  if (
    state.connectedCausalEdgeIds.some((edgeId) => {
      const edge = casePackage.causalEdges.find((item) => item.id === edgeId);
      return (
        !edge ||
        !state.placedCausalNodeIds.includes(edge.fromNodeId) ||
        !state.placedCausalNodeIds.includes(edge.toNodeId)
      );
    })
  ) {
    missing.push("causal-edge-endpoints");
  }
  if (
    !state.caseBrief.selectedConsequenceId ||
    !solution.limitedConsequenceIds.includes(state.caseBrief.selectedConsequenceId)
  ) {
    missing.push("limited-consequence");
  }
  if (!containsEvery(state.caseBrief.selectedUncertaintyIds, solution.uncertaintyIds)) {
    missing.push("uncertainty");
  }
  if (!state.caseBrief.submitted) {
    missing.push("case-brief-submission");
  }

  return { eligible: missing.length === 0, missingRequirementIds: missing };
}
