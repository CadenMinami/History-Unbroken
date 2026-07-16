import { afterEach, describe, expect, it, vi } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import { createCharacterTurn } from "@/lib/openai/character-turn-service";
import type { ModelGateway } from "@/lib/openai/model-gateway";
import { buildAIRequestMetadata } from "@/lib/openai/request-metadata";
import {
  CHARACTER_PROMPT_VERSION,
  characterTurnRequestSchema,
  characterTurnResultSchema,
  type CharacterTurnPlan,
} from "@/schemas/ai-contracts";

function createRequest() {
  const casePackage = loadVarennesCase();
  const state = {
    ...createInitialCaseState(casePackage),
    revision: 6,
    inspectedItemIds: ["E3"],
  };
  return {
    casePackage,
    state,
    request: characterTurnRequestSchema.parse({
      ...buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000001",
      ),
      stationId: "CHAR-DROUET",
      playerMessage: "This report says you turned toward Varennes. What changed?",
      inspectedEvidenceIds: ["E3"],
      presentedEvidenceIds: ["E3"],
      readingMode: "standard",
    }),
  };
}

describe("createCharacterTurn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a validated response plan from authored policy units", async () => {
    const { request, state } = createRequest();
    const before = structuredClone(state);
    const generateStructured = vi.fn().mockResolvedValue({
      claimUnitIds: [],
      evidenceReactionUnitId: "REACTION-DROUET-E3-QUALIFY",
      followUpQuestionUnitId: "FOLLOWUP-DROUET-CORROBORATE",
      refusalUnitId: null,
    } satisfies CharacterTurnPlan);
    const gateway: ModelGateway = { generateStructured };

    const response = await createCharacterTurn(request, { gateway });

    expect(response.status).toBe("ok");
    if (response.status !== "ok") throw new Error("Expected live response.");
    expect(response.turn.spokenResponse).toContain("In the reviewed report, Drouet said");
    expect(response.turn.spokenResponse).toContain("fictional branch");
    expect(response.turn.factIdsUsed).toEqual(["F-S2-002"]);
    expect(response.turn.evidenceIdsReferenced).toEqual(["E3"]);
    expect(response.mutatesCaseState).toBe(false);
    expect("speechAuthorization" in response).toBe(false);
    expect(state).toEqual(before);
    expect(JSON.stringify(generateStructured.mock.calls[0])).not.toContain('"solution"');
    expect(JSON.stringify(generateStructured.mock.calls[0])).not.toContain("E6B");
  });

  it("falls back when the model selects an unauthorized unit", async () => {
    const { request } = createRequest();
    const gateway: ModelGateway = {
      generateStructured: vi.fn().mockResolvedValue({
        claimUnitIds: ["CLAIM-DROUET-SECRET-MOTIVE"],
        evidenceReactionUnitId: null,
        followUpQuestionUnitId: null,
        refusalUnitId: null,
      }),
    };

    const response = await createCharacterTurn(request, { gateway });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback response.");
    expect(response.reason).toBe("unauthorized_output");
    expect(response.turn.spokenResponse).toContain("fictional branch");
    expect("speechAuthorization" in response).toBe(false);
  });

  it("falls back when the model selects no audible response unit", async () => {
    const { request } = createRequest();
    const gateway: ModelGateway = {
      generateStructured: vi.fn().mockResolvedValue({
        claimUnitIds: [],
        evidenceReactionUnitId: null,
        followUpQuestionUnitId: null,
        refusalUnitId: null,
      }),
    };

    const response = await createCharacterTurn(request, { gateway });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback response.");
    expect(response.reason).toBe("unauthorized_output");
    expect(response.turn.spokenResponse.length).toBeGreaterThan(0);
  });

  it("uses an honest authored fallback when no API key is configured", async () => {
    const { request } = createRequest();
    const parseInternalResult = vi.spyOn(characterTurnResultSchema, "parse");

    const response = await createCharacterTurn(request, { gateway: null });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback response.");
    expect(response.reason).toBe("missing_api_key");
    expect(response.source).toBe("deterministic_fallback");
    expect(request.playerMessage).toContain("What changed?");
    expect(parseInternalResult).toHaveBeenCalledOnce();
    expect(parseInternalResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "fallback", reason: "missing_api_key" }),
    );
  });

  it("does not leak an evidence reaction through fallback when no evidence is presented", async () => {
    const { request } = createRequest();
    const withoutEvidence = {
      ...request,
      inspectedEvidenceIds: [],
      presentedEvidenceIds: [],
    };

    const response = await createCharacterTurn(withoutEvidence, { gateway: null });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback response.");
    expect(response.turn.evidenceReaction).toBe("not_presented");
    expect(response.turn.evidenceIdsReferenced).toEqual([]);
    expect(response.turn.factIdsUsed).toEqual([]);
  });

  it("rejects evidence outside the selected station's authored boundary", async () => {
    const { request } = createRequest();
    await expect(
      createCharacterTurn(
        {
          ...request,
          stationId: "CHAR-LOUIS",
          inspectedEvidenceIds: ["E2"],
          presentedEvidenceIds: ["E2"],
        },
        { gateway: null },
      ),
    ).rejects.toThrow(/station.*boundary/i);
  });

  it("retries one transient provider failure before returning a live response", async () => {
    const { request } = createRequest();
    const transientError = Object.assign(new Error("temporary"), { status: 503 });
    const generateStructured = vi
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({
        claimUnitIds: [],
        evidenceReactionUnitId: "REACTION-DROUET-E3-QUALIFY",
        followUpQuestionUnitId: null,
        refusalUnitId: null,
      });

    const response = await createCharacterTurn(request, {
      gateway: { generateStructured },
    });

    expect(response.status).toBe("ok");
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });

  it("retries SDK connection timeouts but does not retry non-transient API errors", async () => {
    const { request } = createRequest();
    const timeout = Object.assign(new Error("timed out"), {
      name: "APIConnectionTimeoutError",
    });
    const timeoutGateway = vi
      .fn()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce({
        claimUnitIds: [],
        evidenceReactionUnitId: "REACTION-DROUET-E3-QUALIFY",
        followUpQuestionUnitId: null,
        refusalUnitId: null,
      });

    const recovered = await createCharacterTurn(request, {
      gateway: { generateStructured: timeoutGateway },
    });
    expect(recovered.status).toBe("ok");
    expect(timeoutGateway).toHaveBeenCalledTimes(2);

    const unauthorized = Object.assign(new Error("bad key"), { status: 401 });
    const nonTransientGateway = vi.fn().mockRejectedValue(unauthorized);
    const failed = await createCharacterTurn(request, {
      gateway: { generateStructured: nonTransientGateway },
    });
    expect(failed.status).toBe("fallback");
    if (failed.status !== "fallback") throw new Error("Expected fallback response.");
    expect(failed.reason).toBe("provider_error");
    expect(failed.retryable).toBe(false);
    expect(nonTransientGateway).toHaveBeenCalledOnce();
  });

  it("uses an authored no-fact refusal and never invokes the model for unsafe input", async () => {
    const { request } = createRequest();
    const generateStructured = vi.fn();
    const check = vi.fn().mockResolvedValue({ flagged: true, categories: ["violence"] });
    const parseInternalResult = vi.spyOn(characterTurnResultSchema, "parse");

    const response = await createCharacterTurn(request, {
      gateway: { generateStructured },
      inputSafety: { check },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected safety fallback.");
    expect(response.reason).toBe("unsafe_input");
    expect(response.turn.spokenResponse).toContain("cannot respond");
    expect(response.turn.factIdsUsed).toEqual([]);
    expect(response.turn.sourceIdsUsed).toEqual([]);
    expect(generateStructured).not.toHaveBeenCalled();
    expect(parseInternalResult).toHaveBeenCalledOnce();
    expect(parseInternalResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "fallback", reason: "unsafe_input" }),
    );
  });
});
