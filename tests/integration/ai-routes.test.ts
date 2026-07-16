import { describe, expect, it, vi } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import { verifySpeechAuthorization } from "@/lib/audio/speech-ticket";
import {
  handleCaseBriefFeedbackRequest,
  handleCharacterTurnRequest,
} from "@/lib/openai/route-handlers";
import { buildAIRequestMetadata } from "@/lib/openai/request-metadata";
import {
  AI_CONTRACT_VERSION,
  CASE_BRIEF_PROMPT_VERSION,
  CHARACTER_PROMPT_VERSION,
} from "@/schemas/ai-contracts";

const SPEECH_SECRET = "0123456789abcdef0123456789abcdef";
const NOW_SECONDS = 1_800_000_000;

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AI route handlers", () => {
  it("validates character input and returns a strict rendered response", async () => {
    const casePackage = loadVarennesCase();
    const state = { ...createInitialCaseState(casePackage), revision: 3 };
    const body = {
      ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000001",
      ),
      stationId: "CHAR-DROUET",
      playerMessage: "What did you observe?",
      inspectedEvidenceIds: [],
      presentedEvidenceIds: [],
      readingMode: "standard",
    };
    const gateway = {
      generateStructured: vi.fn().mockResolvedValue({
        claimUnitIds: ["CLAIM-DROUET-BRANCH-SUSPICION"],
        evidenceReactionUnitId: null,
        followUpQuestionUnitId: "FOLLOWUP-DROUET-CORROBORATE",
        refusalUnitId: null,
      }),
    };

    const response = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", body),
      { gateway, speechAuthorizationSecret: null },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      source: "model",
      authority: "formative_only",
      mutatesCaseState: false,
      speechAuthorization: null,
    });
  });

  it("rejects old AI contracts on both current routes before provider invocation", async () => {
    expect(AI_CONTRACT_VERSION).toBe("1.1.0");
    const casePackage = loadVarennesCase();
    const state = createInitialCaseState(casePackage);
    const characterGateway = {
      generateStructured: vi.fn().mockResolvedValue({
        claimUnitIds: ["CLAIM-DROUET-BRANCH-SUSPICION"],
        evidenceReactionUnitId: null,
        followUpQuestionUnitId: null,
        refusalUnitId: null,
      }),
    };
    const feedbackGateway = { generateStructured: vi.fn() };

    const characterResponse = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", {
        ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
          "00000000-0000-4000-8000-000000000011",
        ),
        contractVersion: "1.0.0",
        stationId: "CHAR-DROUET",
        playerMessage: "What did you observe?",
        inspectedEvidenceIds: [],
        presentedEvidenceIds: [],
        readingMode: "standard",
      }),
      { gateway: characterGateway },
    );
    const feedbackResponse = await handleCaseBriefFeedbackRequest(
      jsonRequest("/api/ai/case-brief-feedback", {
        ...buildAIRequestMetadata(casePackage, state, CASE_BRIEF_PROMPT_VERSION, () =>
          "00000000-0000-4000-8000-000000000012",
        ),
        contractVersion: "1.0.0",
        caseState: state,
      }),
      { gateway: feedbackGateway },
    );

    expect(characterResponse.status).toBe(409);
    expect(feedbackResponse.status).toBe(409);
    expect(await characterResponse.json()).toMatchObject({
      error: { code: "version_mismatch" },
    });
    expect(await feedbackResponse.json()).toMatchObject({
      error: { code: "version_mismatch" },
    });
    expect(characterGateway.generateStructured).not.toHaveBeenCalled();
    expect(feedbackGateway.generateStructured).not.toHaveBeenCalled();
  });

  it("mints speech authorization for an authorized model caption", async () => {
    const casePackage = loadVarennesCase();
    const state = { ...createInitialCaseState(casePackage), revision: 4 };
    const body = {
      ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000021",
      ),
      stationId: "CHAR-DROUET",
      playerMessage: "What did you observe?",
      inspectedEvidenceIds: [],
      presentedEvidenceIds: [],
      readingMode: "standard",
    };
    const response = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", body),
      {
        gateway: {
          generateStructured: vi.fn().mockResolvedValue({
            claimUnitIds: ["CLAIM-DROUET-BRANCH-SUSPICION"],
            evidenceReactionUnitId: null,
            followUpQuestionUnitId: null,
            refusalUnitId: null,
          }),
        },
        speechAuthorizationSecret: SPEECH_SECRET,
        nowEpochSeconds: () => NOW_SECONDS,
      },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      speechAuthorization: {
        mediaVersion: "1.0.0",
        caseId: "varennes",
        stationId: "CHAR-DROUET",
        requestId: body.requestId,
        stateRevision: 4,
        voiceId: "drouet-source-v1",
        expiresAt: NOW_SECONDS + 120,
      },
    });
    expect(payload.speechAuthorization.signature).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      verifySpeechAuthorization(
        {
          caption: payload.turn.spokenResponse,
          authorization: payload.speechAuthorization,
        },
        SPEECH_SECRET,
        NOW_SECONDS,
      ),
    ).toEqual({ ok: true });
  });

  it("mints speech authorization for an authored fallback caption", async () => {
    const casePackage = loadVarennesCase();
    const state = createInitialCaseState(casePackage);
    const body = {
      ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000022",
      ),
      stationId: "CHAR-LOUIS",
      playerMessage: "Why did you leave?",
      inspectedEvidenceIds: [],
      presentedEvidenceIds: [],
      readingMode: "standard",
    };
    const response = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", body),
      {
        gateway: null,
        speechAuthorizationSecret: SPEECH_SECRET,
        nowEpochSeconds: () => NOW_SECONDS,
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "fallback",
      reason: "missing_api_key",
      speechAuthorization: {
        stationId: "CHAR-LOUIS",
        voiceId: "louis-source-v1",
      },
    });
  });

  it("returns 400 for malformed input and 409 for stale package versions", async () => {
    const malformed = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", { playerMessage: "hello" }),
      { gateway: null },
    );

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ error: { code: "invalid_request" } });

    const casePackage = loadVarennesCase();
    const state = createInitialCaseState(casePackage);
    const stale = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", {
        ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
          "00000000-0000-4000-8000-000000000001",
        ),
        caseVersion: "0.9.0",
        stationId: "CHAR-DROUET",
        playerMessage: "hello",
        inspectedEvidenceIds: [],
        presentedEvidenceIds: [],
        readingMode: "standard",
      }),
      { gateway: null },
    );

    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: { code: "version_mismatch" } });
  });

  it("rate limits public model calls before invoking the provider", async () => {
    const casePackage = loadVarennesCase();
    const state = createInitialCaseState(casePackage);
    const body = {
      ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000003",
      ),
      stationId: "CHAR-DROUET",
      playerMessage: "What did you observe?",
      inspectedEvidenceIds: [],
      presentedEvidenceIds: [],
      readingMode: "standard",
    };
    const generateStructured = vi.fn();

    const response = await handleCharacterTurnRequest(
      jsonRequest("/api/ai/character-turn", body),
      {
        gateway: { generateStructured },
        inputSafety: null,
        rateLimiter: { allow: () => false },
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("evaluates only a committed CaseState snapshot and falls back without a key", async () => {
    const casePackage = loadVarennesCase();
    const state = {
      ...createInitialCaseState(casePackage),
      revision: 7,
      phase: "case_brief" as const,
      caseBrief: {
        argument: "The route information mattered, but local action was also necessary.",
        selectedConsequenceId: "CONS-REACTION-CONTINUITY",
        selectedUncertaintyIds: ["UNC-NOT-INEVITABLE"],
        submitted: true,
      },
    };
    const body = {
      ...buildAIRequestMetadata(casePackage, state, CASE_BRIEF_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000002",
      ),
      caseState: state,
    };

    const response = await handleCaseBriefFeedbackRequest(
      jsonRequest("/api/ai/case-brief-feedback", body),
      { gateway: null },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "fallback",
      reason: "missing_api_key",
      mutatesCaseState: false,
    });
  });
});
