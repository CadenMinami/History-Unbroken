import { z } from "zod";

import { epistemicClassificationSchema } from "@/schemas/epistemic-classification";
import { studentProvenanceSchema } from "@/schemas/student-provenance";

const idSchema = z.string().min(1).max(100);
const authoredTextSchema = z
  .object({
    standard: z.string().trim().min(1),
    reduced: z.string().trim().min(1),
  })
  .strict();

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

const historicalUnitFields = {
  text: authoredTextSchema,
  epistemicClassification: epistemicClassificationSchema,
  provenance: studentProvenanceSchema,
  countsAsHistoricalEvidence: z.literal(false),
  factIds: z.array(idSchema),
  sourceIds: z.array(idSchema),
  branchObservationIds: z.array(idSchema),
  requiresPresentedEvidenceIds: z.array(idSchema),
};

const claimUnitSchema = z
  .object({ claimId: idSchema, ...historicalUnitFields })
  .strict()
  .superRefine((unit, context) => {
    if (unit.epistemicClassification === "fictional_counterfactual") {
      if (
        unit.provenance !== "fictional_branch_observation" ||
        unit.branchObservationIds.length === 0 ||
        unit.factIds.length > 0 ||
        unit.sourceIds.length > 0
      ) {
        context.addIssue({
          code: "custom",
          message: "Fictional branch claim units must remain separate from historical facts.",
        });
      }
      return;
    }
    if (
      unit.epistemicClassification !== "dramatization" ||
      unit.provenance !== "dramatized_dialogue"
    ) {
      context.addIssue({
        code: "custom",
        message: "Non-fictional character claim units must be dramatized dialogue.",
      });
    }
    if (hasDuplicates([...unit.factIds, ...unit.sourceIds, ...unit.branchObservationIds])) {
      context.addIssue({ code: "custom", message: "Historical unit IDs must be unique." });
    }
  });

const evidenceReactionUnitSchema = z
  .object({
    evidenceReactionUnitId: idSchema,
    reaction: z.enum(["accepted", "challenged", "qualified", "irrelevant"]),
    ...historicalUnitFields,
  })
  .strict()
  .superRefine((unit, context) => {
    if (
      unit.epistemicClassification !== "dramatization" ||
      unit.provenance !== "dramatized_dialogue"
    ) {
      context.addIssue({
        code: "custom",
        message: "Evidence reactions must remain dramatized dialogue.",
      });
    }
    if (unit.factIds.length > 0 && unit.sourceIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Evidence reactions using facts must cite an allowed source.",
      });
    }
    for (const values of [
      unit.factIds,
      unit.sourceIds,
      unit.branchObservationIds,
      unit.requiresPresentedEvidenceIds,
    ]) {
      if (hasDuplicates(values)) {
        context.addIssue({ code: "custom", message: "Historical unit IDs must be unique." });
      }
    }
  });

const followUpQuestionUnitSchema = z
  .object({
    followUpQuestionUnitId: idSchema,
    text: authoredTextSchema,
  })
  .strict();

const refusalUnknownUnitSchema = z
  .object({
    refusalUnitId: idSchema,
    unknownId: idSchema,
    text: authoredTextSchema,
  })
  .strict();

const safetyRefusalUnitSchema = z
  .object({
    safetyRefusalUnitId: idSchema,
    text: authoredTextSchema,
  })
  .strict();

const explicitUnknownSchema = z
  .object({
    unknownId: idSchema,
    description: z.string().trim().min(1),
  })
  .strict();

const fallbackTurnSchema = z
  .object({
    fallbackTurnId: idSchema,
    claimUnitIds: z.array(idSchema).max(3),
    evidenceReactionUnitId: idSchema.nullable(),
    followUpQuestionUnitId: idSchema.nullable(),
    refusalUnitId: idSchema.nullable(),
  })
  .strict();

const stationBase = {
  stationId: idSchema,
  name: z.string().trim().min(1),
  roleLabel: z.string().trim().min(1),
  disclosure: z.string().trim().min(1),
  allowedFactIds: z.array(idSchema),
  allowedSourceIds: z.array(idSchema),
  allowedEvidenceIds: z.array(idSchema),
  allowedClaimIds: z.array(idSchema),
  recordableClaimIds: z.array(idSchema).max(0),
  explicitUnknowns: z.array(explicitUnknownSchema),
  responseBoundaries: z.array(z.string().trim().min(1)),
};

const generatedStationSchema = z
  .object({
    ...stationBase,
    mode: z.literal("generated_dialogue"),
    claimUnits: z.array(claimUnitSchema),
    evidenceReactionUnits: z.array(evidenceReactionUnitSchema),
    followUpQuestionUnits: z.array(followUpQuestionUnitSchema),
    refusalUnknownUnits: z.array(refusalUnknownUnitSchema),
    safetyRefusalUnit: safetyRefusalUnitSchema,
    fallbackTurns: z.array(fallbackTurnSchema).min(1),
  })
  .strict()
  .superRefine((station, context) => {
    const claimIds = station.claimUnits.map((unit) => unit.claimId);
    if (
      hasDuplicates(claimIds) ||
      hasDuplicates(station.allowedClaimIds) ||
      claimIds.length !== station.allowedClaimIds.length ||
      claimIds.some((id) => !station.allowedClaimIds.includes(id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Allowed claim IDs must exactly match the unique authored claim units.",
      });
    }
    const reactionIds = station.evidenceReactionUnits.map(
      (unit) => unit.evidenceReactionUnitId,
    );
    const followUpIds = station.followUpQuestionUnits.map(
      (unit) => unit.followUpQuestionUnitId,
    );
    const refusalIds = station.refusalUnknownUnits.map((unit) => unit.refusalUnitId);
    const fallbackIds = station.fallbackTurns.map((unit) => unit.fallbackTurnId);
    const stationAllowlists = [
      station.allowedFactIds,
      station.allowedSourceIds,
      station.allowedEvidenceIds,
      station.recordableClaimIds,
      reactionIds,
      followUpIds,
      refusalIds,
      fallbackIds,
    ];
    if (stationAllowlists.some(hasDuplicates)) {
      context.addIssue({ code: "custom", message: "Station policy IDs must be unique." });
    }
    for (const unit of [...station.claimUnits, ...station.evidenceReactionUnits]) {
      if (
        unit.factIds.some((id) => !station.allowedFactIds.includes(id)) ||
        unit.sourceIds.some((id) => !station.allowedSourceIds.includes(id)) ||
        unit.requiresPresentedEvidenceIds.some(
          (id) => !station.allowedEvidenceIds.includes(id),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Authored units must remain inside the station allowlists.",
        });
      }
    }
    for (const fallback of station.fallbackTurns) {
      if (
        fallback.claimUnitIds.some((id) => !claimIds.includes(id)) ||
        (fallback.evidenceReactionUnitId &&
          !reactionIds.includes(fallback.evidenceReactionUnitId)) ||
        (fallback.followUpQuestionUnitId &&
          !followUpIds.includes(fallback.followUpQuestionUnitId)) ||
        (fallback.refusalUnitId && !refusalIds.includes(fallback.refusalUnitId))
      ) {
        context.addIssue({ code: "custom", message: "Fallback turns must use authored units." });
      }
    }
  });

const staticStationSchema = z
  .object({
    ...stationBase,
    mode: z.literal("static_dossier"),
  })
  .strict();

const summaryTemplateSchema = z
  .object({
    summaryTemplateId: idSchema,
    formativeStatus: z.enum([
      "contradicted_by_record",
      "plausible_under_evidenced",
      "supported_incomplete",
      "well_supported",
    ]),
    text: authoredTextSchema,
  })
  .strict();

const rubricReasonTemplateSchema = z
  .object({
    rubricReasonId: idSchema,
    criterion: z.enum([
      "sourcing",
      "corroboration",
      "causalReasoning",
      "claimEvidenceFit",
      "uncertainty",
    ]),
    scoreBand: z.enum(["missing", "developing", "strong"]),
    text: authoredTextSchema,
  })
  .strict();

const revisionPromptTemplateSchema = z
  .object({ revisionPromptId: idSchema, text: authoredTextSchema })
  .strict();

const issueExplanationTemplateSchema = z
  .object({
    issueTemplateId: idSchema,
    issueType: z.enum([
      "unsupported",
      "overconfident",
      "single_cause",
      "inevitability",
      "source_fit",
    ]),
    text: authoredTextSchema,
  })
  .strict();

export const modelPolicySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    policyVersion: z.literal("1.0.1"),
    caseId: z.literal("varennes"),
    caseVersion: z.literal("1.0.3"),
    stationPolicies: z.array(
      z.discriminatedUnion("mode", [generatedStationSchema, staticStationSchema]),
    ),
    feedbackUnits: z
      .object({
        summaryTemplates: z.array(summaryTemplateSchema),
        rubricReasonTemplates: z.array(rubricReasonTemplateSchema),
        revisionPromptTemplates: z.array(revisionPromptTemplateSchema),
        issueExplanationTemplates: z.array(issueExplanationTemplateSchema),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    const stationIds = policy.stationPolicies.map((station) => station.stationId);
    if (hasDuplicates(stationIds)) {
      context.addIssue({ code: "custom", message: "Station IDs must be unique." });
    }
  });

export type ModelPolicy = z.infer<typeof modelPolicySchema>;
export type GeneratedStationPolicy = Extract<
  ModelPolicy["stationPolicies"][number],
  { mode: "generated_dialogue" }
>;
