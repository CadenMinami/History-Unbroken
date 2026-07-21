import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  SPEECH_AUTHORIZATION_TTL_SECONDS,
  authorizedSpeechRequestSchema,
  mediaCorrelationSchema,
  speechAuthorizationSchema,
  speechCaptionSchema,
  type MediaCorrelation,
  type ApprovedSpeechVoiceId,
  type GeneratedDialogueStationId,
  type SpeechAuthorization,
} from "@/schemas/media-contracts";

const MINIMUM_SECRET_BYTES = 32;
const HMAC_BYTES = 32;
const speechVoiceByStation = {
  "CHAR-DROUET": "drouet-source-v1",
  "CHAR-LOUIS": "louis-source-v1",
} as const satisfies Record<GeneratedDialogueStationId, ApprovedSpeechVoiceId>;

interface SpeechAuthorizationMintInput {
  caption: string;
  correlation: MediaCorrelation;
}

function getApprovedSpeechVoiceId(
  stationId: GeneratedDialogueStationId,
): ApprovedSpeechVoiceId {
  return speechVoiceByStation[stationId];
}

export type SpeechAuthorizationVerification =
  | { ok: true }
  | { ok: false; reason: "invalid_authorization" | "authorization_expired" };

function hasUsableSecret(secret: string | null | undefined): secret is string {
  return typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= MINIMUM_SECRET_BYTES;
}

function isValidEpochSeconds(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function encodeCanonicalField(name: string, value: string): string {
  return `${Buffer.byteLength(name, "utf8")}:${name}${Buffer.byteLength(value, "utf8")}:${value}`;
}

function canonicalSigningRepresentation(
  authorization: Omit<SpeechAuthorization, "signature">,
): string {
  return [
    ["domain", "unchanged-speech-authorization-v1"],
    ["mediaVersion", authorization.mediaVersion],
    ["caseId", authorization.caseId],
    ["stationId", authorization.stationId],
    ["requestId", authorization.requestId],
    ["stateRevision", String(authorization.stateRevision)],
    ["voiceId", authorization.voiceId],
    ["captionSha256", authorization.captionSha256],
    ["expiresAt", String(authorization.expiresAt)],
  ]
    .map(([name, value]) => encodeCanonicalField(name, value))
    .join("");
}

function signAuthorization(
  authorization: Omit<SpeechAuthorization, "signature">,
  secret: string,
): Buffer {
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(canonicalSigningRepresentation(authorization), "utf8")
    .digest();
}

function decodeCanonicalSignature(signature: string): Buffer | null {
  try {
    const decoded = Buffer.from(signature, "base64url");
    if (decoded.length !== HMAC_BYTES || decoded.toString("base64url") !== signature) return null;
    return decoded;
  } catch {
    return null;
  }
}

function equalHexDigests(left: string, right: string): boolean {
  try {
    const leftBytes = Buffer.from(left, "hex");
    const rightBytes = Buffer.from(right, "hex");
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
  } catch {
    return false;
  }
}

export function hashSpeechCaption(caption: string): string {
  return createHash("sha256").update(Buffer.from(caption, "utf8")).digest("hex");
}

export function mintSpeechAuthorization(
  input: SpeechAuthorizationMintInput,
  secret: string | null | undefined,
  nowEpochSeconds = Math.floor(Date.now() / 1_000),
): SpeechAuthorization | null {
  if (!hasUsableSecret(secret) || !isValidEpochSeconds(nowEpochSeconds)) return null;
  const correlation = mediaCorrelationSchema.safeParse(input.correlation);
  const caption = speechCaptionSchema.safeParse(input.caption);
  if (!correlation.success || !caption.success) return null;

  const unsignedAuthorization = {
    ...correlation.data,
    voiceId: getApprovedSpeechVoiceId(correlation.data.stationId),
    captionSha256: hashSpeechCaption(caption.data),
    expiresAt: nowEpochSeconds + SPEECH_AUTHORIZATION_TTL_SECONDS,
  } as const;
  const authorization = speechAuthorizationSchema.safeParse({
    ...unsignedAuthorization,
    signature: signAuthorization(unsignedAuthorization, secret).toString("base64url"),
  });
  return authorization.success ? authorization.data : null;
}

export function verifySpeechAuthorization(
  request: unknown,
  secret: string | null | undefined,
  nowEpochSeconds = Math.floor(Date.now() / 1_000),
): SpeechAuthorizationVerification {
  if (!hasUsableSecret(secret) || !isValidEpochSeconds(nowEpochSeconds)) {
    return { ok: false, reason: "invalid_authorization" };
  }
  const parsed = authorizedSpeechRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, reason: "invalid_authorization" };

  const { authorization, caption } = parsed.data;
  if (authorization.voiceId !== getApprovedSpeechVoiceId(authorization.stationId)) {
    return { ok: false, reason: "invalid_authorization" };
  }
  if (!equalHexDigests(authorization.captionSha256, hashSpeechCaption(caption))) {
    return { ok: false, reason: "invalid_authorization" };
  }

  const { signature, ...unsignedAuthorization } = authorization;
  const suppliedSignature = decodeCanonicalSignature(signature);
  const expectedSignature = signAuthorization(unsignedAuthorization, secret);
  if (
    !suppliedSignature ||
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return { ok: false, reason: "invalid_authorization" };
  }

  if (authorization.expiresAt <= nowEpochSeconds) {
    return { ok: false, reason: "authorization_expired" };
  }
  if (authorization.expiresAt - nowEpochSeconds > SPEECH_AUTHORIZATION_TTL_SECONDS) {
    return { ok: false, reason: "invalid_authorization" };
  }
  return { ok: true };
}
