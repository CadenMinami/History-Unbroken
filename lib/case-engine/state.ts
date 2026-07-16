import type { CasePackage } from "@/schemas/case-package";
import type { CaseState } from "@/schemas/case-state";

export function createInitialCaseState(casePackage: CasePackage): CaseState {
  return {
    stateVersion: "1.2.0",
    caseId: casePackage.caseId,
    caseSchemaVersion: casePackage.schemaVersion,
    caseVersion: casePackage.caseVersion,
    revision: 0,
    phase: "primer",
    completedCommandIds: [],
    inspectedItemIds: [],
    completedComparisonIds: [],
    rejectedAnomalyIds: [],
    activeAnomalyId: null,
    pinnedEvidenceIds: [],
    selectedConditionIds: [],
    placedCausalNodeIds: [],
    connectedCausalEdgeIds: [],
    completedRepairActionIds: [],
    completedRepairStepIds: [],
    caseBrief: {
      argument: "",
      selectedConsequenceId: null,
      selectedUncertaintyIds: [],
      submitted: false,
    },
    repairCompleted: false,
  };
}
