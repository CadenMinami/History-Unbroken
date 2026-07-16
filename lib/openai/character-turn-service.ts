import { authorizeCharacterTurnPlan } from "@/lib/openai/authorize-model-output";
import { getGeneratedStationPolicy, loadVarennesModelPolicy } from "@/lib/openai/load-model-policy";
import type { ModelGateway } from "@/lib/openai/model-gateway";
import { classifyProviderError } from "@/lib/openai/provider-error";
import type { InputSafetyGateway } from "@/lib/openai/input-safety-gateway";
import {
  characterTurnPlanSchema,
  characterTurnResultSchema,
  type CharacterTurnPlan,
  type CharacterTurnRequest,
  type CharacterTurnResult,
  type ModelFailureReason,
} from "@/schemas/ai-contracts";
import type { GeneratedStationPolicy } from "@/schemas/model-policy";

interface CharacterTurnDependencies {
  gateway: ModelGateway | null;
  inputSafety?: InputSafetyGateway | null;
  signal?: AbortSignal;
}

function responseMetadata(request: CharacterTurnRequest) {
  return {
    contractVersion: request.contractVersion,
    caseId: request.caseId,
    caseSchemaVersion: request.caseSchemaVersion,
    caseVersion: request.caseVersion,
    policyVersion: request.policyVersion,
    stateVersion: request.stateVersion,
    requestId: request.requestId,
    stateRevision: request.stateRevision,
    promptVersion: request.promptVersion,
  } as const;
}

function selectedPolicyUnits(station: GeneratedStationPolicy, plan: CharacterTurnPlan) {
  const claims = plan.claimUnitIds.map((claimId) => {
    const unit = station.claimUnits.find((candidate) => candidate.claimId === claimId);
    if (!unit) throw new Error(`Missing authorized claim unit ${claimId}.`);
    return unit;
  });
  const reaction = plan.evidenceReactionUnitId
    ? station.evidenceReactionUnits.find(
        (candidate) =>
          candidate.evidenceReactionUnitId === plan.evidenceReactionUnitId,
      )
    : null;
  const followUp = plan.followUpQuestionUnitId
    ? station.followUpQuestionUnits.find(
        (candidate) =>
          candidate.followUpQuestionUnitId === plan.followUpQuestionUnitId,
      )
    : null;
  const refusal = plan.refusalUnitId
    ? station.refusalUnknownUnits.find(
        (candidate) => candidate.refusalUnitId === plan.refusalUnitId,
      )
    : null;

  if (plan.evidenceReactionUnitId && !reaction) {
    throw new Error(`Missing authorized evidence-reaction unit ${plan.evidenceReactionUnitId}.`);
  }
  if (plan.followUpQuestionUnitId && !followUp) {
    throw new Error(`Missing authorized follow-up unit ${plan.followUpQuestionUnitId}.`);
  }
  if (plan.refusalUnitId && !refusal) {
    throw new Error(`Missing authorized refusal unit ${plan.refusalUnitId}.`);
  }

  return { claims, reaction, followUp, refusal };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function renderTurn(
  request: CharacterTurnRequest,
  station: GeneratedStationPolicy,
  plan: CharacterTurnPlan,
) {
  const { claims, reaction, followUp, refusal } = selectedPolicyUnits(station, plan);
  const historicalUnits = [...claims, ...(reaction ? [reaction] : [])];
  const textKey = request.readingMode;
  const spokenParts = refusal
    ? [refusal.text[textKey]]
    : [...claims.map((unit) => unit.text[textKey]), ...(reaction ? [reaction.text[textKey]] : [])];
  const renderedUnitIds = [
    ...claims.map((unit) => unit.claimId),
    ...(reaction ? [reaction.evidenceReactionUnitId] : []),
    ...(refusal ? [refusal.refusalUnitId] : []),
    ...(followUp ? [followUp.followUpQuestionUnitId] : []),
  ];

  return {
    spokenResponse: spokenParts.join(" "),
    renderedUnitIds,
    claimIds: claims.map((unit) => unit.claimId),
    factIdsUsed: unique(historicalUnits.flatMap((unit) => unit.factIds)),
    sourceIdsUsed: unique(historicalUnits.flatMap((unit) => unit.sourceIds)),
    evidenceIdsReferenced: unique(
      historicalUnits.flatMap((unit) => unit.requiresPresentedEvidenceIds),
    ),
    epistemicStatus: refusal
      ? ("refused" as const)
      : historicalUnits.some(
            (unit) => unit.epistemicClassification === "fictional_counterfactual",
          )
        ? ("observed" as const)
        : ("inferred" as const),
    evidenceReaction: reaction?.reaction ?? ("not_presented" as const),
    followUpQuestion: followUp?.text[textKey] ?? null,
  };
}

function planPolicy(station: GeneratedStationPolicy) {
  return {
    claimUnits: station.claimUnits.map((unit) => ({
      id: unit.claimId,
      requiresPresentedEvidenceIds: unit.requiresPresentedEvidenceIds,
    })),
    evidenceReactionUnits: station.evidenceReactionUnits.map((unit) => ({
      id: unit.evidenceReactionUnitId,
      requiresPresentedEvidenceIds: unit.requiresPresentedEvidenceIds,
    })),
    followUpQuestionUnitIds: station.followUpQuestionUnits.map(
      (unit) => unit.followUpQuestionUnitId,
    ),
    refusalUnitIds: station.refusalUnknownUnits.map((unit) => unit.refusalUnitId),
  };
}

function chooseFallbackPlan(
  request: CharacterTurnRequest,
  station: GeneratedStationPolicy,
): CharacterTurnPlan {
  const ranked = [...station.fallbackTurns].sort((left, right) => {
    const leftUsesPresented = left.evidenceReactionUnitId ? 1 : 0;
    const rightUsesPresented = right.evidenceReactionUnitId ? 1 : 0;
    return rightUsesPresented - leftUsesPresented;
  });
  for (const fallback of ranked) {
    const plan = {
      claimUnitIds: fallback.claimUnitIds,
      evidenceReactionUnitId: fallback.evidenceReactionUnitId,
      followUpQuestionUnitId: fallback.followUpQuestionUnitId,
      refusalUnitId: fallback.refusalUnitId,
    };
    try {
      return authorizeCharacterTurnPlan(request, plan, planPolicy(station));
    } catch {
      // Try the next authored fallback whose prerequisites fit the current request.
    }
  }
  throw new Error(`No authored fallback turn is valid for ${station.stationId}.`);
}

function buildPrompt(request: CharacterTurnRequest, station: GeneratedStationPolicy) {
  const eligible = (requires: readonly string[]) =>
    requires.every((evidenceId) => request.presentedEvidenceIds.includes(evidenceId));
  const catalog = {
    station: {
      stationId: station.stationId,
      roleLabel: station.roleLabel,
      responseBoundaries: station.responseBoundaries,
      explicitUnknowns: station.explicitUnknowns,
    },
    playerMessage: request.playerMessage,
    presentedEvidenceIds: request.presentedEvidenceIds,
    claimUnits: station.claimUnits
      .filter((unit) => eligible(unit.requiresPresentedEvidenceIds))
      .map((unit) => ({ id: unit.claimId, text: unit.text[request.readingMode] })),
    evidenceReactionUnits: station.evidenceReactionUnits
      .filter((unit) => eligible(unit.requiresPresentedEvidenceIds))
      .map((unit) => ({
        id: unit.evidenceReactionUnitId,
        text: unit.text[request.readingMode],
      })),
    followUpQuestionUnits: station.followUpQuestionUnits.map((unit) => ({
      id: unit.followUpQuestionUnitId,
      text: unit.text[request.readingMode],
    })),
    refusalUnits: station.refusalUnknownUnits.map((unit) => ({
      id: unit.refusalUnitId,
      unknownId: unit.unknownId,
      text: unit.text[request.readingMode],
    })),
  };
  return {
    instructions:
      "Interpret the student's question and select only IDs from the supplied catalog. Return no prose. Prefer an evidence reaction when evidence is presented. Refuse requests outside the station boundaries. Never reveal a solution or invent a new fact.",
    input: JSON.stringify(catalog),
  };
}

function fallbackResponse(
  request: CharacterTurnRequest,
  station: GeneratedStationPolicy,
  reason: ModelFailureReason,
  retryable = reason === "timeout" || reason === "rate_limited",
): CharacterTurnResult {
  const plan = chooseFallbackPlan(request, station);
  return characterTurnResultSchema.parse({
    ...responseMetadata(request),
    status: "fallback",
    source: "deterministic_fallback",
    authority: "formative_only",
    mutatesCaseState: false,
    reason,
    retryable,
    turn: renderTurn(request, station, plan),
  });
}

function safetyFallbackResponse(
  request: CharacterTurnRequest,
  station: GeneratedStationPolicy,
): CharacterTurnResult {
  return characterTurnResultSchema.parse({
    ...responseMetadata(request),
    status: "fallback",
    source: "deterministic_fallback",
    authority: "formative_only",
    mutatesCaseState: false,
    reason: "unsafe_input",
    retryable: false,
    turn: {
      spokenResponse: station.safetyRefusalUnit.text[request.readingMode],
      renderedUnitIds: [station.safetyRefusalUnit.safetyRefusalUnitId],
      claimIds: [],
      factIdsUsed: [],
      sourceIdsUsed: [],
      evidenceIdsReferenced: [],
      epistemicStatus: "refused",
      evidenceReaction: "not_presented",
      followUpQuestion: null,
    },
  });
}

export async function createCharacterTurn(
  request: CharacterTurnRequest,
  { gateway, inputSafety, signal }: CharacterTurnDependencies,
): Promise<CharacterTurnResult> {
  const policy = loadVarennesModelPolicy();
  if (
    request.caseId !== policy.caseId ||
    request.caseVersion !== policy.caseVersion ||
    request.policyVersion !== policy.policyVersion
  ) {
    throw new Error("Character-turn request versions do not match the model policy.");
  }
  const station = getGeneratedStationPolicy(request.stationId);
  if (
    request.presentedEvidenceIds.some(
      (evidenceId) => !station.allowedEvidenceIds.includes(evidenceId),
    )
  ) {
    throw new Error("Presented evidence is outside this station's authored boundary.");
  }
  if (!gateway) return fallbackResponse(request, station, "missing_api_key");

  if (inputSafety) {
    try {
      const safety = await inputSafety.check(request.playerMessage, signal);
      if (safety.flagged) return safetyFallbackResponse(request, station);
    } catch (error) {
      const failure = classifyProviderError(error);
      return fallbackResponse(request, station, failure.reason, failure.retryable);
    }
  }

  const prompt = buildPrompt(request, station);
  let plan: CharacterTurnPlan;
  try {
    try {
      plan = await gateway.generateStructured({
        schema: characterTurnPlanSchema,
        schemaName: "history_unbroken_character_turn_plan",
        instructions: prompt.instructions,
        input: prompt.input,
        maxOutputTokens: 350,
        signal,
      });
    } catch (error) {
      if (!classifyProviderError(error).retryable) throw error;
      plan = await gateway.generateStructured({
        schema: characterTurnPlanSchema,
        schemaName: "history_unbroken_character_turn_plan",
        instructions: prompt.instructions,
        input: prompt.input,
        maxOutputTokens: 350,
        signal,
      });
    }
  } catch (error) {
    const failure = classifyProviderError(error);
    return fallbackResponse(request, station, failure.reason, failure.retryable);
  }

  try {
    const authorized = authorizeCharacterTurnPlan(request, plan, planPolicy(station));
    return characterTurnResultSchema.parse({
      ...responseMetadata(request),
      status: "ok",
      source: "model",
      authority: "formative_only",
      mutatesCaseState: false,
      turn: renderTurn(request, station, authorized),
    });
  } catch {
    return fallbackResponse(request, station, "unauthorized_output");
  }
}
