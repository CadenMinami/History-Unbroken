import { z } from "zod";

const glossaryEntrySchema = z
  .object({
    term: z.string().min(1),
    definition: z.string().min(1),
  })
  .strict();

const contextInterpretationSchema = z
  .object({
    id: z.string().regex(/^I-/),
    claim: z.string().min(1),
    authority: z.literal("orientation_only"),
    conditionEligible: z.literal(false),
    sourceLedgerEntryId: z.literal("S11"),
    boundary: z.string().min(1),
  })
  .strict();

const requiredInterpretationGroupSchema = z
  .object({
    allOf: z.array(z.string().regex(/^I-/)).min(2),
  })
  .strict();

export const primerCardSchema = z
  .object({
    id: z.string().min(1),
    sequence: z.number().int().min(1).max(6),
    title: z.string().min(1),
    standardText: z.string().min(1),
    reducedText: z.string().min(1),
    classification: z.enum(["verified_context", "contested_interpretation"]),
    factIds: z.array(z.string().min(1)).min(1),
    interpretationIds: z.array(z.string().regex(/^I-/)),
    retainedTerms: z.array(z.string().min(1)).min(1),
    visual: z.enum([
      "revolution",
      "crown",
      "constitution",
      "tuileries",
      "contested",
      "departure",
    ]),
    glossary: glossaryEntrySchema.nullable(),
    closingPrompt: z.string().min(1).nullable(),
  })
  .strict();

export const contextPrimerSchema = z
  .object({
    version: z.literal("1.0.0"),
    interpretations: z.array(contextInterpretationSchema).min(2),
    requiredInterpretationGroups: z.array(requiredInterpretationGroupSchema).min(1),
    cards: z.array(primerCardSchema).length(6),
  })
  .strict()
  .superRefine((primer, context) => {
    const sequences = primer.cards.map((card) => card.sequence);
    if (new Set(sequences).size !== sixSequence.length) {
      context.addIssue({
        code: "custom",
        path: ["cards"],
        message: "Primer card sequence values must be unique.",
      });
    }
    if (!sixSequence.every((sequence) => sequences.includes(sequence))) {
      context.addIssue({
        code: "custom",
        path: ["cards"],
        message: "Primer cards must cover sequence values 1 through 6.",
      });
    }

    const interpretationIds = new Set(primer.interpretations.map((item) => item.id));
    for (const [groupIndex, group] of primer.requiredInterpretationGroups.entries()) {
      if (group.allOf.some((interpretationId) => !interpretationIds.has(interpretationId))) {
        context.addIssue({
          code: "custom",
          path: ["requiredInterpretationGroups", groupIndex, "allOf"],
          message: "Required interpretation groups may only reference known interpretations.",
        });
      }
    }

    for (const [index, card] of primer.cards.entries()) {
      const hasInvalidInterpretation = card.interpretationIds.some(
        (interpretationId) => !interpretationIds.has(interpretationId),
      );
      if (hasInvalidInterpretation) {
        context.addIssue({
          code: "custom",
          path: ["cards", index, "interpretationIds"],
          message: "Primer card references an unknown context interpretation.",
        });
      }
      if (
        (card.classification === "contested_interpretation" &&
          card.interpretationIds.length === 0) ||
        (card.classification === "verified_context" && card.interpretationIds.length > 0)
      ) {
        context.addIssue({
          code: "custom",
          path: ["cards", index, "classification"],
          message: "Primer classification does not match its interpretation authority.",
        });
      }

      for (const group of primer.requiredInterpretationGroups) {
        const includesAny = group.allOf.some((interpretationId) =>
          card.interpretationIds.includes(interpretationId),
        );
        const includesAll = group.allOf.every((interpretationId) =>
          card.interpretationIds.includes(interpretationId),
        );
        if (includesAny && !includesAll) {
          context.addIssue({
            code: "custom",
            path: ["cards", index, "interpretationIds"],
            message: "Primer card must include every interpretation in a required group.",
          });
        }
      }
    }
  });

const sixSequence = [1, 2, 3, 4, 5, 6];

export type PrimerCard = z.infer<typeof primerCardSchema>;
export type ContextPrimer = z.infer<typeof contextPrimerSchema>;
