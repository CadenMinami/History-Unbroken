import { describe, expect, it, vi } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { getRepairEligibility } from "@/lib/case-engine/repair-eligibility";
import { createInitialCaseState } from "@/lib/case-engine/state";
import { createCaseBriefFeedback } from "@/lib/openai/case-brief-feedback-service";
import type { ModelGateway } from "@/lib/openai/model-gateway";
import { buildAIRequestMetadata } from "@/lib/openai/request-metadata";
import {
  CASE_BRIEF_PROMPT_VERSION,
  caseBriefFeedbackRequestSchema,
  type CaseBriefFeedbackPlan,
} from "@/schemas/ai-contracts";

function createRequest() {
  const casePackage = loadVarennesCase();
  const state = {
    ...createInitialCaseState(casePackage),
    revision: 11,
    phase: "case_brief" as const,
    pinnedEvidenceIds: ["E3"],
    caseBrief: {
      argument:
        "The route information changed the pursuit, and E3 supports that claim. Local action also mattered.",
      selectedConsequenceId: "CONS-REACTION-CONTINUITY",
      selectedUncertaintyIds: ["UNC-NOT-INEVITABLE"],
      submitted: true,
    },
  };
  return {
    casePackage,
    state,
    request: caseBriefFeedbackRequestSchema.parse({
      ...buildAIRequestMetadata(casePackage, state, CASE_BRIEF_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000002",
      ),
      caseState: state,
    }),
  };
}

const supportedPlan: CaseBriefFeedbackPlan = {
  formativeStatus: "supported_incomplete",
  summaryTemplateId: "SUMMARY-SUPPORTED-INCOMPLETE",
  evidenceClaimLinks: [
    {
      evidenceId: "E3",
      studentSpan: "route information changed the pursuit",
      fit: "supports",
    },
  ],
  concernSpans: [],
  rubricScores: {
    sourcing: 3,
    corroboration: 2,
    causalReasoning: 3,
    claimEvidenceFit: 3,
    uncertainty: 2,
  },
  rubricReasonIds: {
    sourcing: "RUBRIC-SOURCING-STRONG",
    corroboration: "RUBRIC-CORROBORATION-DEVELOPING",
    causalReasoning: "RUBRIC-CAUSAL-STRONG",
    claimEvidenceFit: "RUBRIC-FIT-STRONG",
    uncertainty: "RUBRIC-UNCERTAINTY-DEVELOPING",
  },
  revisionPromptId: "REVISION-LOCAL-ACTION",
};

describe("createCaseBriefFeedback", () => {
  it("renders model-selected feedback from authored templates without changing repair authority", async () => {
    const { casePackage, request, state } = createRequest();
    const before = structuredClone(state);
    const eligibilityBefore = getRepairEligibility(casePackage, state);
    const generateStructured = vi.fn().mockResolvedValue(supportedPlan);

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured },
    });

    expect(response.status).toBe("ok");
    if (response.status !== "ok") throw new Error("Expected live feedback.");
    expect(response.feedback.summary).toContain("causal reasoning");
    expect(response.feedback.evidenceClaimLinks[0]?.studentSpan).toBe(
      "route information changed the pursuit",
    );
    expect(response.feedback.rubricReasons.sourcing).toContain("source claims");
    expect(response.mutatesCaseState).toBe(false);
    expect(state).toEqual(before);
    expect(getRepairEligibility(casePackage, state)).toEqual(eligibilityBefore);
    const modelRequest = generateStructured.mock.calls[0]?.[0];
    if (!modelRequest) throw new Error("Expected a model request.");
    expect(modelRequest.input).not.toContain('"solution"');
    expect(modelRequest.input).toContain('"dependencyLineageIds"');
    expect(modelRequest.input).toContain('"sourceLineageIds"');
    expect(modelRequest.input).toContain('"limitations"');
  });

  it("falls back when feedback cites words the student did not write", async () => {
    const { request } = createRequest();
    const gateway: ModelGateway = {
      generateStructured: vi.fn().mockResolvedValue({
        ...supportedPlan,
        evidenceClaimLinks: [
          { evidenceId: "E3", studentSpan: "invented student sentence", fit: "supports" },
        ],
      }),
    };

    const response = await createCaseBriefFeedback(request, { gateway });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
    expect(response).not.toHaveProperty("feedback.rubricScores");
  });

  it("uses honest no-score fallback feedback when the API key is absent", async () => {
    const { request } = createRequest();

    const response = await createCaseBriefFeedback(request, { gateway: null });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("missing_api_key");
    expect(response.displayMessage).toContain("repair status is unchanged");
    expect(response).not.toHaveProperty("feedback");
  });

  it("rejects maximum corroboration when the pinned records contain one historical lineage", async () => {
    const { casePackage, request, state } = createRequest();
    const maximumPlan: CaseBriefFeedbackPlan = {
      ...supportedPlan,
      formativeStatus: "well_supported",
      summaryTemplateId: "SUMMARY-WELL-SUPPORTED",
      rubricScores: {
        sourcing: 4,
        corroboration: 4,
        causalReasoning: 4,
        claimEvidenceFit: 4,
        uncertainty: 4,
      },
      rubricReasonIds: {
        sourcing: "RUBRIC-SOURCING-STRONG",
        corroboration: "RUBRIC-CORROBORATION-STRONG",
        causalReasoning: "RUBRIC-CAUSAL-STRONG",
        claimEvidenceFit: "RUBRIC-FIT-STRONG",
        uncertainty: "RUBRIC-UNCERTAINTY-STRONG",
      },
    };

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured: vi.fn().mockResolvedValue(maximumPlan) },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
    expect(getRepairEligibility(casePackage, state).eligible).toBe(false);
  });

  it("rejects a contradicted status without a contradictory evidence link", async () => {
    const { request } = createRequest();
    const incoherentPlan: CaseBriefFeedbackPlan = {
      ...supportedPlan,
      formativeStatus: "contradicted_by_record",
      summaryTemplateId: "SUMMARY-CONTRADICTED",
    };

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured: vi.fn().mockResolvedValue(incoherentPlan) },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
  });

  it("does not count unrelated pinned lineages as corroboration for the linked claim", async () => {
    const { request } = createRequest();
    const inflatedRequest = {
      ...request,
      caseState: {
        ...request.caseState,
        pinnedEvidenceIds: ["E3", "E5", "E7"],
      },
    };
    const inflatedPlan: CaseBriefFeedbackPlan = {
      ...supportedPlan,
      rubricScores: { ...supportedPlan.rubricScores, corroboration: 4 },
      rubricReasonIds: {
        ...supportedPlan.rubricReasonIds,
        corroboration: "RUBRIC-CORROBORATION-STRONG",
      },
    };

    const response = await createCaseBriefFeedback(inflatedRequest, {
      gateway: { generateStructured: vi.fn().mockResolvedValue(inflatedPlan) },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
  });

  it("rejects formative statuses whose rubric scores deny the stated weakness", async () => {
    const { request } = createRequest();
    const uniformlyStrong: CaseBriefFeedbackPlan = {
      ...supportedPlan,
      rubricScores: {
        sourcing: 4,
        corroboration: 4,
        causalReasoning: 4,
        claimEvidenceFit: 4,
        uncertainty: 4,
      },
      rubricReasonIds: {
        sourcing: "RUBRIC-SOURCING-STRONG",
        corroboration: "RUBRIC-CORROBORATION-STRONG",
        causalReasoning: "RUBRIC-CAUSAL-STRONG",
        claimEvidenceFit: "RUBRIC-FIT-STRONG",
        uncertainty: "RUBRIC-UNCERTAINTY-STRONG",
      },
    };

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured: vi.fn().mockResolvedValue(uniformlyStrong) },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
  });

  it("requires a contradicted status to score claim-to-evidence fit as missing", async () => {
    const { request } = createRequest();
    const incoherentPlan: CaseBriefFeedbackPlan = {
      ...supportedPlan,
      formativeStatus: "contradicted_by_record",
      summaryTemplateId: "SUMMARY-CONTRADICTED",
      evidenceClaimLinks: [
        {
          evidenceId: "E3",
          studentSpan: "route information changed the pursuit",
          fit: "contradicts",
        },
      ],
      rubricScores: { ...supportedPlan.rubricScores, claimEvidenceFit: 4 },
      rubricReasonIds: {
        ...supportedPlan.rubricReasonIds,
        claimEvidenceFit: "RUBRIC-FIT-STRONG",
      },
    };

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured: vi.fn().mockResolvedValue(incoherentPlan) },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected fallback feedback.");
    expect(response.reason).toBe("unauthorized_output");
  });

  it("fails closed without scores when submitted text is flagged by input safety", async () => {
    const { request } = createRequest();
    const generateStructured = vi.fn();

    const response = await createCaseBriefFeedback(request, {
      gateway: { generateStructured },
      inputSafety: {
        check: vi.fn().mockResolvedValue({ flagged: true, categories: ["harassment"] }),
      },
    });

    expect(response.status).toBe("fallback");
    if (response.status !== "fallback") throw new Error("Expected safety fallback.");
    expect(response.reason).toBe("unsafe_input");
    expect(response.displayMessage).toContain("was not sent for AI feedback");
    expect(response).not.toHaveProperty("feedback");
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
