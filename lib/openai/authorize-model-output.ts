import type {
  CaseBriefFeedbackPlan,
  CaseBriefFeedbackRequest,
  CharacterTurnPlan,
  CharacterTurnRequest,
} from "@/schemas/ai-contracts";

export interface CharacterClaimUnitPolicy {
  id: string;
  requiresPresentedEvidenceIds: readonly string[];
}

export interface CharacterEvidenceReactionUnitPolicy {
  id: string;
  requiresPresentedEvidenceIds: readonly string[];
}

export interface CharacterTurnPlanPolicy {
  claimUnits: readonly CharacterClaimUnitPolicy[];
  evidenceReactionUnits: readonly CharacterEvidenceReactionUnitPolicy[];
  followUpQuestionUnitIds: readonly string[];
  refusalUnitIds: readonly string[];
}

export interface CaseBriefFeedbackPlanPolicy {
  summaryTemplateIds: readonly string[];
  rubricReasonIds: readonly string[];
  revisionPromptIds: readonly string[];
  issueTemplateIds: readonly string[];
  evidenceIds: readonly string[];
}

function assertAllowed(label: string, value: string | null, allowedValues: readonly string[]) {
  if (value !== null && !allowedValues.includes(value)) {
    throw new Error(`Model plan used unauthorized ${label} ID: ${value}.`);
  }
}

function assertAllowedList(label: string, values: readonly string[], allowedValues: readonly string[]) {
  const unauthorized = values.find((value) => !allowedValues.includes(value));
  if (unauthorized) {
    throw new Error(`Model plan used unauthorized ${label} ID: ${unauthorized}.`);
  }
}

function assertStudentSpan(argument: string, span: string) {
  if (!argument.toLocaleLowerCase().includes(span.toLocaleLowerCase())) {
    throw new Error(`Model plan cited a student span that is not present in the Case Brief: ${span}.`);
  }
}

export function authorizeCharacterTurnPlan(
  request: CharacterTurnRequest,
  plan: CharacterTurnPlan,
  policy: CharacterTurnPlanPolicy,
): CharacterTurnPlan {
  if (
    plan.claimUnitIds.length === 0 &&
    plan.evidenceReactionUnitId === null &&
    plan.refusalUnitId === null
  ) {
    throw new Error("Character plan did not select an audible authored response unit.");
  }
  if (
    plan.refusalUnitId &&
    (plan.claimUnitIds.length > 0 || plan.evidenceReactionUnitId !== null)
  ) {
    throw new Error("A refusal plan cannot include historical claims or evidence reactions.");
  }
  const claimUnitsById = new Map(policy.claimUnits.map((unit) => [unit.id, unit]));
  const evidenceReactionUnitsById = new Map(
    policy.evidenceReactionUnits.map((unit) => [unit.id, unit]),
  );
  assertAllowedList("claim", plan.claimUnitIds, [...claimUnitsById.keys()]);
  assertAllowed(
    "evidence reaction",
    plan.evidenceReactionUnitId,
    [...evidenceReactionUnitsById.keys()],
  );
  assertAllowed(
    "follow-up question",
    plan.followUpQuestionUnitId,
    policy.followUpQuestionUnitIds,
  );
  assertAllowed("refusal", plan.refusalUnitId, policy.refusalUnitIds);

  const presented = new Set(request.presentedEvidenceIds);
  for (const claimId of plan.claimUnitIds) {
    const claimUnit = claimUnitsById.get(claimId);
    if (
      claimUnit?.requiresPresentedEvidenceIds.some((evidenceId) => !presented.has(evidenceId))
    ) {
      throw new Error(`Claim unit ${claimId} is missing a presented-evidence prerequisite.`);
    }
  }

  if (plan.evidenceReactionUnitId) {
    const reactionUnit = evidenceReactionUnitsById.get(plan.evidenceReactionUnitId);
    if (
      reactionUnit?.requiresPresentedEvidenceIds.some(
        (evidenceId) => !presented.has(evidenceId),
      )
    ) {
      throw new Error(
        `Evidence reaction unit ${plan.evidenceReactionUnitId} is missing a presented-evidence prerequisite.`,
      );
    }
  }

  return plan;
}

export function authorizeCaseBriefFeedbackPlan(
  request: CaseBriefFeedbackRequest,
  plan: CaseBriefFeedbackPlan,
  policy: CaseBriefFeedbackPlanPolicy,
): CaseBriefFeedbackPlan {
  const argument = request.caseState.caseBrief.argument;
  assertAllowed("summary template", plan.summaryTemplateId, policy.summaryTemplateIds);
  assertAllowed("revision prompt", plan.revisionPromptId, policy.revisionPromptIds);
  assertAllowedList(
    "rubric reason",
    Object.values(plan.rubricReasonIds),
    policy.rubricReasonIds,
  );

  for (const link of plan.evidenceClaimLinks) {
    assertAllowed("evidence", link.evidenceId, policy.evidenceIds);
    if (!request.caseState.pinnedEvidenceIds.includes(link.evidenceId)) {
      throw new Error(`Feedback referenced evidence that was not pinned: ${link.evidenceId}.`);
    }
    assertStudentSpan(argument, link.studentSpan);
  }

  for (const concern of plan.concernSpans) {
    assertAllowed("issue template", concern.issueTemplateId, policy.issueTemplateIds);
    assertAllowedList("evidence", concern.evidenceIds, policy.evidenceIds);
    const unpinnedEvidenceId = concern.evidenceIds.find(
      (evidenceId) => !request.caseState.pinnedEvidenceIds.includes(evidenceId),
    );
    if (unpinnedEvidenceId) {
      throw new Error(`Feedback concern referenced evidence that was not pinned: ${unpinnedEvidenceId}.`);
    }
    assertStudentSpan(argument, concern.studentSpan);
  }

  return plan;
}
