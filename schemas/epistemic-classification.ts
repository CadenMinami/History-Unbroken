import { z } from "zod";

export const epistemicClassificationSchema = z.enum([
  "verified_record",
  "source_claim",
  "contested_interpretation",
  "reconstruction",
  "dramatization",
  "fictional_counterfactual",
  "class_material",
]);

export type EpistemicClassification = z.infer<typeof epistemicClassificationSchema>;
