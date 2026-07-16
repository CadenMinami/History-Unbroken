import type { CasePackage } from "@/schemas/case-package";
import type { CaseState } from "@/schemas/case-state";

export function getPinnedHistoricalLineageIds(
  casePackage: CasePackage,
  state: CaseState,
): string[] {
  const pinned = new Set(state.pinnedEvidenceIds);
  const lineages = casePackage.evidence
    .filter((item) => pinned.has(item.id) && item.countsAsHistoricalEvidence)
    .flatMap((item) => item.sourceLineageIds);

  return [...new Set(lineages)];
}

export function containsEvery<T>(selected: readonly T[], required: readonly T[]): boolean {
  const selectedSet = new Set(selected);
  return required.every((item) => selectedSet.has(item));
}

export function isInvestigationComplete(casePackage: CasePackage, state: CaseState): boolean {
  return (
    containsEvery(state.completedComparisonIds, casePackage.solution.requiredComparisonIds) &&
    state.activeAnomalyId === casePackage.solution.activeAnomalyId &&
    containsEvery(state.rejectedAnomalyIds, casePackage.solution.rejectedAnomalyIds)
  );
}

interface CausalLinkProposal {
  fromNodeId: string;
  toNodeId: string;
  verb: string;
}

export function matchAuthoredCausalEdge(
  casePackage: CasePackage,
  proposal: CausalLinkProposal,
): CasePackage["causalEdges"][number] | null {
  return (
    casePackage.causalEdges.find(
      (edge) =>
        edge.fromNodeId === proposal.fromNodeId &&
        edge.toNodeId === proposal.toNodeId &&
        edge.verb === proposal.verb,
    ) ?? null
  );
}
