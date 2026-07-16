import { z } from "zod";

export const verificationStatusSchema = z.enum([
  "verified",
  "partial",
  "requires_verification",
  "rejected",
]);

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
