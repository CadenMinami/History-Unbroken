import { z } from "zod";

const idSchema = z.string().min(1);

export const repairStepIds = [
  "RS-01-ROUTE",
  "RS-02-PURSUIT",
  "RS-03-WARNING",
  "RS-04-MOBILIZATION",
  "RS-05-OBSTRUCTION",
  "RS-06-DETENTION",
] as const;

export const repairStepIdSchema = z.enum(repairStepIds);

export const repairActionIds = ["RA-05-OBSTRUCTION", "RA-05-PASSPORT"] as const;

export const repairActionIdSchema = z.enum(repairActionIds);

const linkedHistoricalItemSchema = z
  .object({
    id: idSchema,
    statement: z.string().min(1),
    evidenceIds: z.array(idSchema).min(1),
    sourceIds: z.array(idSchema).min(1),
  })
  .strict();

const repairStepSchema = linkedHistoricalItemSchema
  .extend({
    id: repairStepIdSchema,
    sequence: z.number().int().min(1).max(6),
    title: z.string().min(1),
    actionLabel: z.string().min(1),
    nodeIds: z.array(idSchema).min(1),
    edgeIds: z.array(idSchema).min(1),
    requiredActionIds: z.array(repairActionIdSchema),
    factIds: z.array(idSchema).min(1),
    provenance: z.literal("historical_reconstruction"),
  })
  .strict();

const politicalMeaningSchema = linkedHistoricalItemSchema
  .extend({
    factIds: z.array(idSchema).min(1),
    provenance: z.literal("bounded_historical_observation"),
  })
  .strict();

const debriefReconstructionSchema = linkedHistoricalItemSchema
  .extend({
    factIds: z.array(idSchema).min(1),
    provenance: z.literal("historical_reconstruction"),
    limitations: z.string().min(1),
  })
  .strict();

export const reconstructionSchema = z
  .object({
    version: z.literal("1.1.0"),
    caseId: z.string().min(1),
    caseVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    repairSteps: z.array(repairStepSchema).length(6),
    politicalMeaning: z.array(politicalMeaningSchema).min(2),
    counterfactualBoundary: z
      .object({
        label: z.literal("UNKNOWN"),
        statement: z.string().min(1),
        provenance: z.literal("fictional_counterfactual_boundary"),
      })
      .strict(),
    debrief: z
      .object({
        established: z.array(debriefReconstructionSchema).min(1),
        claimLimits: z
          .array(
            z
              .object({
                id: idSchema,
                statement: z.string().min(1),
                uncertaintyId: idSchema,
              })
              .strict(),
          )
          .min(1),
        finalStateBoundary: z.string().min(1),
        teacherReviewBoundary: z.string().min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const sequences = value.repairSteps.map((step) => step.sequence);
    if (
      new Set(sequences).size !== 6 ||
      ![1, 2, 3, 4, 5, 6].every((sequence) => sequences.includes(sequence)) ||
      !value.repairSteps.every(
        (step, index) => step.sequence === index + 1 && step.id === repairStepIds[index],
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["repairSteps"],
        message: "Repair steps must contain the authored IDs and sequence values in order.",
      });
    }
  });

export type Reconstruction = z.infer<typeof reconstructionSchema>;
