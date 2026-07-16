import {
  canonicalAudioMimeTypeSchema,
  type CanonicalAudioMimeType,
  type MediaCorrelation,
  type MediaFailureReason,
} from "@/schemas/media-contracts";

export function normalizeAudioMimeType(value: string): CanonicalAudioMimeType | null {
  const canonical = value.split(";", 1)[0]?.trim().toLowerCase();
  const parsed = canonicalAudioMimeTypeSchema.safeParse(canonical);
  return parsed.success ? parsed.data : null;
}

export function isCurrentMediaCorrelation(
  current: MediaCorrelation,
  candidate: MediaCorrelation,
): boolean {
  return (
    current.mediaVersion === candidate.mediaVersion &&
    current.caseId === candidate.caseId &&
    current.stationId === candidate.stationId &&
    current.requestId === candidate.requestId &&
    current.stateRevision === candidate.stateRevision
  );
}

export function isRetryableMediaFailure(
  reason: MediaFailureReason,
  providerErrorIsTransient = false,
): boolean {
  if (reason === "timeout" || reason === "rate_limited") return true;
  if (reason === "provider_error") return providerErrorIsTransient;
  return false;
}
