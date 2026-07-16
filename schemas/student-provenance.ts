import { z } from "zod";

export const studentProvenanceSchema = z.enum([
  "verified_historical_record",
  "contested_interpretation",
  "historical_reconstruction",
  "dramatized_dialogue",
  "fictional_temporal_anomaly",
  "fictional_branch_observation",
  "class_material",
]);

export type StudentProvenance = z.infer<typeof studentProvenanceSchema>;

export const allowedProvenanceByClassification = {
  verified_record: ["verified_historical_record"],
  source_claim: ["verified_historical_record"],
  contested_interpretation: ["contested_interpretation"],
  reconstruction: ["historical_reconstruction"],
  dramatization: ["dramatized_dialogue"],
  fictional_counterfactual: [
    "fictional_temporal_anomaly",
    "fictional_branch_observation",
  ],
  class_material: ["class_material"],
} as const satisfies Record<string, readonly StudentProvenance[]>;
