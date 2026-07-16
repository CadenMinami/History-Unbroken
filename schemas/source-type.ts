import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "primary",
  "secondary",
  "reconstruction",
  "fiction",
  "dramatization",
  "class_packet",
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;
