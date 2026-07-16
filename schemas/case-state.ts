import { z } from "zod";

import { repairActionIdSchema, repairStepIdSchema } from "./reconstruction";

const anomalyIdSchema = z.enum(["E6A", "E6B", "E6C"]);
export const CASE_BRIEF_ARGUMENT_MAX_LENGTH = 2_400;

export const caseStateSchema = z
  .object({
    stateVersion: z.literal("1.2.0"),
    caseId: z.string().min(1),
    caseSchemaVersion: z.string().min(1),
    caseVersion: z.string().min(1),
    revision: z.number().int().nonnegative(),
    phase: z.enum([
      "primer",
      "fracture",
      "investigation",
      "case_brief",
      "repair",
      "debrief",
    ]),
    completedCommandIds: z.array(z.string().min(1)).max(128),
    inspectedItemIds: z.array(z.string().min(1)).max(24),
    completedComparisonIds: z.array(z.string().min(1)).max(16),
    rejectedAnomalyIds: z.array(anomalyIdSchema).max(3),
    activeAnomalyId: anomalyIdSchema.nullable(),
    pinnedEvidenceIds: z.array(z.string().min(1)).max(8),
    selectedConditionIds: z.array(z.string().min(1)).max(8),
    placedCausalNodeIds: z.array(z.string().min(1)).max(24),
    connectedCausalEdgeIds: z.array(z.string().min(1)).max(32),
    completedRepairActionIds: z.array(repairActionIdSchema).max(2),
    completedRepairStepIds: z.array(repairStepIdSchema).max(8),
    caseBrief: z
      .object({
        argument: z.string().max(CASE_BRIEF_ARGUMENT_MAX_LENGTH),
        selectedConsequenceId: z.string().min(1).nullable(),
        selectedUncertaintyIds: z.array(z.string().min(1)).max(8),
        submitted: z.boolean(),
      })
      .strict(),
    repairCompleted: z.boolean(),
  })
  .strict();

export type CaseState = z.infer<typeof caseStateSchema>;
