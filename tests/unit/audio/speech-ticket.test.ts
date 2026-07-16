import { describe, expect, it } from "vitest";

import {
  hashSpeechCaption,
  mintSpeechAuthorization,
  verifySpeechAuthorization,
} from "@/lib/audio/speech-ticket";
import {
  MEDIA_CONTRACT_VERSION,
  SPEECH_AUTHORIZATION_TTL_SECONDS,
  type AuthorizedSpeechRequest,
  type MediaCorrelation,
} from "@/schemas/media-contracts";

const NOW_SECONDS = 1_800_000_000;
const SECRET = "0123456789abcdef0123456789abcdef";
const WRONG_SECRET = "abcdef0123456789abcdef0123456789";
const CAPTION = "  Exact visible caption: cafe\u0301.  ";
const correlation = {
  mediaVersion: MEDIA_CONTRACT_VERSION,
  caseId: "varennes",
  stationId: "CHAR-DROUET",
  requestId: "00000000-0000-4000-8000-000000000001",
  stateRevision: 12,
} satisfies MediaCorrelation;

function mintRequest(): AuthorizedSpeechRequest {
  const authorization = mintSpeechAuthorization(
    { caption: CAPTION, correlation },
    SECRET,
    NOW_SECONDS,
  );
  if (!authorization) throw new Error("Expected a speech authorization fixture.");
  return { caption: CAPTION, authorization };
}

describe("speech authorization tickets", () => {
  it("mints a 120-second authorization for the station-owned logical voice", () => {
    const request = mintRequest();

    expect(request.authorization).toMatchObject({
      ...correlation,
      voiceId: "drouet-source-v1",
      captionSha256: hashSpeechCaption(CAPTION),
      expiresAt: NOW_SECONDS + SPEECH_AUTHORIZATION_TTL_SECONDS,
    });
    expect(request.authorization.signature).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const louisAuthorization = mintSpeechAuthorization(
      { caption: CAPTION, correlation: { ...correlation, stationId: "CHAR-LOUIS" } },
      SECRET,
      NOW_SECONDS,
    );
    expect(louisAuthorization?.voiceId).toBe("louis-source-v1");
  });

  it("verifies the exact authorized caption without trimming or Unicode normalization", () => {
    const request = mintRequest();

    expect(verifySpeechAuthorization(request, SECRET, NOW_SECONDS)).toEqual({ ok: true });
    expect(
      verifySpeechAuthorization({ ...request, caption: CAPTION.trim() }, SECRET, NOW_SECONDS),
    ).toEqual({ ok: false, reason: "invalid_authorization" });
    expect(
      verifySpeechAuthorization(
        { ...request, caption: CAPTION.normalize("NFC") },
        SECRET,
        NOW_SECONDS,
      ),
    ).toEqual({ ok: false, reason: "invalid_authorization" });
  });

  it("rejects an expired ticket", () => {
    const request = mintRequest();

    expect(
      verifySpeechAuthorization(request, SECRET, request.authorization.expiresAt),
    ).toEqual({ ok: false, reason: "authorization_expired" });
  });

  it("rejects a valid ticket presented more than 120 seconds before its expiry", () => {
    const request = mintRequest();

    expect(verifySpeechAuthorization(request, SECRET, NOW_SECONDS)).toEqual({ ok: true });
    expect(verifySpeechAuthorization(request, SECRET, NOW_SECONDS - 1)).toEqual({
      ok: false,
      reason: "invalid_authorization",
    });
  });

  it.each([
    ["media version", { mediaVersion: "0.9.0" }],
    ["voice", { voiceId: "louis-source-v1" }],
    ["station", { stationId: "CHAR-LOUIS" }],
    ["request ID", { requestId: "00000000-0000-4000-8000-000000000002" }],
    ["revision", { stateRevision: 13 }],
    ["case", { caseId: "another-case" }],
  ])("rejects an altered %s", (_label, authorizationChange) => {
    const request = mintRequest();

    expect(
      verifySpeechAuthorization(
        {
          ...request,
          authorization: { ...request.authorization, ...authorizationChange },
        },
        SECRET,
        NOW_SECONDS,
      ),
    ).toEqual({ ok: false, reason: "invalid_authorization" });
  });

  it("rejects the wrong secret", () => {
    expect(verifySpeechAuthorization(mintRequest(), WRONG_SECRET, NOW_SECONDS)).toEqual({
      ok: false,
      reason: "invalid_authorization",
    });
  });

  it("fails closed for malformed or short signatures", () => {
    const request = mintRequest();

    expect(
      verifySpeechAuthorization(
        {
          ...request,
          authorization: { ...request.authorization, signature: "short!" },
        },
        SECRET,
        NOW_SECONDS,
      ),
    ).toEqual({ ok: false, reason: "invalid_authorization" });
  });

  it("fails closed without throwing when the secret is absent or shorter than 32 UTF-8 bytes", () => {
    expect(mintSpeechAuthorization({ caption: CAPTION, correlation }, undefined, NOW_SECONDS)).toBe(
      null,
    );
    expect(mintSpeechAuthorization({ caption: CAPTION, correlation }, "too-short", NOW_SECONDS)).toBe(
      null,
    );
    expect(verifySpeechAuthorization(mintRequest(), "too-short", NOW_SECONDS)).toEqual({
      ok: false,
      reason: "invalid_authorization",
    });
  });
});
