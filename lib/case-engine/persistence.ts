import { z } from "zod";

import { getRepairEligibility } from "./repair-eligibility";
import { loadVarennesReconstruction } from "./load-reconstruction";
import { isInvestigationComplete } from "./selectors";
import { createInitialCaseState } from "./state";
import type { CasePackage } from "@/schemas/case-package";
import { type CaseState, caseStateSchema } from "@/schemas/case-state";
import type { Reconstruction } from "@/schemas/reconstruction";

const defaultReconstruction = loadVarennesReconstruction();

const persistenceEnvelopeSchema = z
  .object({
    persistenceVersion: z.literal("1.2.0"),
    savedAt: z.string().datetime(),
    state: caseStateSchema,
  })
  .strict();

export interface RestoreResult {
  state: CaseState;
  recovered: boolean;
  reason?: string;
}

export function serializeCaseState(state: CaseState): string {
  return JSON.stringify({
    persistenceVersion: "1.2.0",
    savedAt: new Date().toISOString(),
    state,
  });
}

function referencesOnlyCaseItems(casePackage: CasePackage, state: CaseState): boolean {
  const comparableIds = new Set([
    ...casePackage.evidence.map((item) => item.id),
    ...casePackage.anomalies.map((item) => item.id),
    ...casePackage.branchObservations.map((item) => item.id),
  ]);
  const evidenceIds = new Set(casePackage.evidence.map((item) => item.id));
  const comparisonIds = new Set(casePackage.comparisonFindings.map((item) => item.id));
  const conditionIds = new Set(casePackage.conditions.map((item) => item.id));
  const nodeIds = new Set(casePackage.causalNodes.map((item) => item.id));
  const edgeIds = new Set(casePackage.causalEdges.map((item) => item.id));
  const consequenceIds = new Set(casePackage.solution.limitedConsequenceIds);
  const uncertaintyIds = new Set(casePackage.uncertainties.map((item) => item.id));

  return (
    state.inspectedItemIds.every((id) => comparableIds.has(id)) &&
    state.pinnedEvidenceIds.every((id) => evidenceIds.has(id)) &&
    state.completedComparisonIds.every((id) => comparisonIds.has(id)) &&
    state.selectedConditionIds.every((id) => conditionIds.has(id)) &&
    state.placedCausalNodeIds.every((id) => nodeIds.has(id)) &&
    state.connectedCausalEdgeIds.every((id) => edgeIds.has(id)) &&
    (!state.caseBrief.selectedConsequenceId ||
      consequenceIds.has(state.caseBrief.selectedConsequenceId)) &&
    state.caseBrief.selectedUncertaintyIds.every((id) => uncertaintyIds.has(id))
  );
}

function isReachableCaseState(
  casePackage: CasePackage,
  state: CaseState,
  reconstruction: Reconstruction,
): boolean {
  const repairStepIds = reconstruction.repairSteps.map((step) => step.id);
  const repairActionIds = [
    ...new Set(reconstruction.repairSteps.flatMap((step) => step.requiredActionIds)),
  ];
  const uniqueStateLists = [
    state.completedCommandIds,
    state.inspectedItemIds,
    state.completedComparisonIds,
    state.rejectedAnomalyIds,
    state.pinnedEvidenceIds,
    state.selectedConditionIds,
    state.placedCausalNodeIds,
    state.connectedCausalEdgeIds,
    state.caseBrief.selectedUncertaintyIds,
    state.completedRepairActionIds,
    state.completedRepairStepIds,
  ];
  if (
    uniqueStateLists.some((items) => new Set(items).size !== items.length) ||
    state.revision !== state.completedCommandIds.length
  ) {
    return false;
  }

  const phaseCommandMinimum = {
    primer: 0,
    fracture: 1,
    investigation: 2,
    case_brief: 3,
    repair: 4,
    debrief: 5,
  }[state.phase];
  if (
    (state.phase === "primer" && state.revision !== 0) ||
    (state.phase === "fracture" && state.revision !== 1)
  ) {
    return false;
  }
  const caseBriefWasUpdated =
    state.caseBrief.argument.length > 0 ||
    state.caseBrief.selectedConsequenceId !== null ||
    state.caseBrief.selectedUncertaintyIds.length > 0;
  const structuralCommandMinimum =
    phaseCommandMinimum +
    state.inspectedItemIds.length +
    state.completedComparisonIds.length +
    state.rejectedAnomalyIds.length +
    (state.activeAnomalyId ? 1 : 0) +
    state.pinnedEvidenceIds.length +
    state.selectedConditionIds.length +
    state.placedCausalNodeIds.length +
    state.connectedCausalEdgeIds.length +
    (state.completedRepairStepIds.length === repairStepIds.length &&
    state.completedRepairActionIds.length === repairActionIds.length
      ? 1
      : state.completedRepairStepIds.length + state.completedRepairActionIds.length) +
    (caseBriefWasUpdated ? 1 : 0) +
    (state.caseBrief.submitted ? 1 : 0);
  if (state.revision < structuralCommandMinimum) return false;
  if (
    !state.completedRepairStepIds.every(
      (stepId, index) => stepId === repairStepIds[index],
    )
  ) {
    return false;
  }
  const hasAllRepairActions = repairActionIds.every((actionId) =>
    state.completedRepairActionIds.includes(actionId),
  );
  const completedStepCount = state.completedRepairStepIds.length;
  const actionFirstRequiredAt = new Map(
    repairActionIds.map((actionId) => [
      actionId,
      reconstruction.repairSteps.findIndex((step) =>
        step.requiredActionIds.includes(actionId),
      ),
    ]),
  );
  const completedStepsMissingActions = reconstruction.repairSteps
    .slice(0, completedStepCount)
    .some((step) =>
      step.requiredActionIds.some(
        (actionId) => !state.completedRepairActionIds.includes(actionId),
      ),
    );
  if (
    state.completedRepairActionIds.some((actionId) => {
      const firstRequiredAt = actionFirstRequiredAt.get(actionId);
      return firstRequiredAt === undefined || completedStepCount < firstRequiredAt;
    }) || completedStepsMissingActions
  ) {
    return false;
  }
  if (state.pinnedEvidenceIds.some((id) => !state.inspectedItemIds.includes(id))) {
    return false;
  }

  const completedFindings = casePackage.comparisonFindings.filter((finding) =>
    state.completedComparisonIds.includes(finding.id),
  );
  if (
    completedFindings.some((finding) =>
      finding.requiredItemIds.some((id) => !state.inspectedItemIds.includes(id)),
    )
  ) {
    return false;
  }
  if (
    state.rejectedAnomalyIds.some(
      (anomalyId) =>
        !completedFindings.some(
          (finding) =>
            finding.result.action === "reject_anomaly" &&
            finding.result.anomalyId === anomalyId,
        ),
    ) ||
    (state.activeAnomalyId !== null &&
      !completedFindings.some(
        (finding) =>
          finding.result.action === "support_active_anomaly" &&
          finding.result.anomalyId === state.activeAnomalyId,
      ))
  ) {
    return false;
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
    return false;
  }

  const beforeInvestigation = state.phase === "primer" || state.phase === "fracture";
  if (
    beforeInvestigation &&
    (state.inspectedItemIds.length > 0 ||
      state.completedComparisonIds.length > 0 ||
      state.rejectedAnomalyIds.length > 0 ||
      state.activeAnomalyId !== null ||
      state.pinnedEvidenceIds.length > 0)
  ) {
    return false;
  }

  const beforeCaseBrief = beforeInvestigation || state.phase === "investigation";
  if (
    beforeCaseBrief &&
    (state.selectedConditionIds.length > 0 ||
      state.placedCausalNodeIds.length > 0 ||
      state.connectedCausalEdgeIds.length > 0 ||
      state.caseBrief.selectedConsequenceId !== null ||
      state.caseBrief.selectedUncertaintyIds.length > 0 ||
      state.caseBrief.submitted)
  ) {
    return false;
  }

  if (!beforeCaseBrief && !isInvestigationComplete(casePackage, state)) {
    return false;
  }

  const beforeRepair = beforeCaseBrief || state.phase === "case_brief";
  if (
    beforeRepair &&
    (state.completedRepairActionIds.length > 0 || state.completedRepairStepIds.length > 0)
  ) {
    return false;
  }

  const eligibility = getRepairEligibility(casePackage, state);
  if (state.phase === "repair" && !eligibility.eligible) return false;
  if (
    state.phase === "debrief" &&
    (!state.repairCompleted ||
      !eligibility.eligible ||
      !hasAllRepairActions ||
      state.completedRepairStepIds.length !== repairStepIds.length)
  ) {
    return false;
  }
  if (state.repairCompleted && state.phase !== "debrief") return false;

  return true;
}

export function restoreCaseState(
  casePackage: CasePackage,
  serialized: string,
  reconstruction: Reconstruction = defaultReconstruction,
): RestoreResult {
  const initial = createInitialCaseState(casePackage);

  try {
    const parsed = persistenceEnvelopeSchema.safeParse(JSON.parse(serialized));
    if (!parsed.success) return { state: initial, recovered: true, reason: "invalid-envelope" };

    const state = parsed.data.state;
    if (
      state.caseId !== casePackage.caseId ||
      state.caseSchemaVersion !== casePackage.schemaVersion ||
      state.caseVersion !== casePackage.caseVersion ||
      !referencesOnlyCaseItems(casePackage, state)
    ) {
      return { state: initial, recovered: true, reason: "incompatible-state" };
    }
    if (!isReachableCaseState(casePackage, state, reconstruction)) {
      return { state: initial, recovered: true, reason: "unreachable-state" };
    }

    return { state, recovered: false };
  } catch {
    return { state: initial, recovered: true, reason: "invalid-json" };
  }
}
