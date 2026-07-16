import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import {
  authorizeCaseBriefFeedbackPlan,
  authorizeCharacterTurnPlan,
} from "@/lib/openai/authorize-model-output";
import {
  AI_CONTRACT_VERSION,
  CASE_BRIEF_PROMPT_VERSION,
  CHARACTER_PROMPT_VERSION,
  MODEL_POLICY_VERSION,
  type CaseBriefFeedbackPlan,
  type CaseBriefFeedbackRequest,
  type CharacterTurnPlan,
  type CharacterTurnRequest,
} from "@/schemas/ai-contracts";

const correlation = {
  contractVersion: AI_CONTRACT_VERSION,
  caseId: "varennes",
  caseSchemaVersion: "1.0.0",
  caseVersion: "1.0.3",
  policyVersion: MODEL_POLICY_VERSION,
  stateVersion: "1.2.0",
  requestId: "00000000-0000-4000-8000-000000000001",
  stateRevision: 4,
} as const;

const characterRequest: CharacterTurnRequest = {
  ...correlation,
  promptVersion: CHARACTER_PROMPT_VERSION,
  stationId: "CHAR-DROUET",
  playerMessage: "What did the route report change?",
  inspectedEvidenceIds: ["E3"],
  presentedEvidenceIds: ["E3"],
  readingMode: "standard",
};

const characterPlan: CharacterTurnPlan = {
  claimUnitIds: ["CLAIM-DROUET-ROUTE"],
  evidenceReactionUnitId: "REACTION-DROUET-E3-QUALIFY",
  followUpQuestionUnitId: "FOLLOWUP-DROUET-CORROBORATE",
  refusalUnitId: null,
};

const caseState = {
  ...createInitialCaseState(loadVarennesCase()),
  revision: 9,
  pinnedEvidenceIds: ["E3", "E4", "E5"],
  caseBrief: {
    argument: "The route information changed the pursuit, and E3 supports that claim.",
    selectedConsequenceId: "CONS-REACTION-CONTINUITY",
    selectedUncertaintyIds: ["UNC-NOT-INEVITABLE"],
    submitted: true,
  },
};

const feedbackRequest: CaseBriefFeedbackRequest = {
  ...correlation,
  stateRevision: 9,
  promptVersion: CASE_BRIEF_PROMPT_VERSION,
  caseState,
};

const feedbackPlan: CaseBriefFeedbackPlan = {
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
  revisionPromptId: "REVISION-UNCERTAINTY",
};

describe("model output authorization", () => {
  it("accepts a character plan whose unit IDs and evidence prerequisites are authorized", () => {
    expect(
      authorizeCharacterTurnPlan(characterRequest, characterPlan, {
        claimUnits: [
          { id: "CLAIM-DROUET-ROUTE", requiresPresentedEvidenceIds: ["E3"] },
        ],
        evidenceReactionUnits: [
          { id: "REACTION-DROUET-E3-QUALIFY", requiresPresentedEvidenceIds: ["E3"] },
        ],
        followUpQuestionUnitIds: ["FOLLOWUP-DROUET-CORROBORATE"],
        refusalUnitIds: ["REFUSAL-DROUET-UNKNOWN"],
      }),
    ).toEqual(characterPlan);
  });

  it("rejects a character claim when its evidence prerequisite is not presented", () => {
    expect(() =>
      authorizeCharacterTurnPlan(
        { ...characterRequest, presentedEvidenceIds: [] },
        characterPlan,
        {
          claimUnits: [
            { id: "CLAIM-DROUET-ROUTE", requiresPresentedEvidenceIds: ["E3"] },
          ],
          evidenceReactionUnits: [
            { id: "REACTION-DROUET-E3-QUALIFY", requiresPresentedEvidenceIds: ["E3"] },
          ],
          followUpQuestionUnitIds: ["FOLLOWUP-DROUET-CORROBORATE"],
          refusalUnitIds: ["REFUSAL-DROUET-UNKNOWN"],
        },
      ),
    ).toThrow(/prerequisite/i);
  });

  it("rejects an evidence reaction when its evidence prerequisite is not presented", () => {
    expect(() =>
      authorizeCharacterTurnPlan(
        { ...characterRequest, presentedEvidenceIds: [] },
        { ...characterPlan, claimUnitIds: [] },
        {
          claimUnits: [
            { id: "CLAIM-DROUET-ROUTE", requiresPresentedEvidenceIds: ["E3"] },
          ],
          evidenceReactionUnits: [
            { id: "REACTION-DROUET-E3-QUALIFY", requiresPresentedEvidenceIds: ["E3"] },
          ],
          followUpQuestionUnitIds: ["FOLLOWUP-DROUET-CORROBORATE"],
          refusalUnitIds: ["REFUSAL-DROUET-UNKNOWN"],
        },
      ),
    ).toThrow(/evidence reaction.*prerequisite/i);
  });

  it("rejects unknown response-plan IDs", () => {
    expect(() =>
      authorizeCharacterTurnPlan(
        characterRequest,
        { ...characterPlan, claimUnitIds: ["CLAIM-DROUET-SECRET-MOTIVE"] },
        {
          claimUnits: [
            { id: "CLAIM-DROUET-ROUTE", requiresPresentedEvidenceIds: ["E3"] },
          ],
          evidenceReactionUnits: [
            { id: "REACTION-DROUET-E3-QUALIFY", requiresPresentedEvidenceIds: ["E3"] },
          ],
          followUpQuestionUnitIds: ["FOLLOWUP-DROUET-CORROBORATE"],
          refusalUnitIds: ["REFUSAL-DROUET-UNKNOWN"],
        },
      ),
    ).toThrow(/claim/i);
  });

  it("accepts feedback only when templates, evidence, and student spans are authorized", () => {
    expect(
      authorizeCaseBriefFeedbackPlan(feedbackRequest, feedbackPlan, {
        summaryTemplateIds: ["SUMMARY-SUPPORTED-INCOMPLETE"],
        rubricReasonIds: Object.values(feedbackPlan.rubricReasonIds),
        revisionPromptIds: ["REVISION-UNCERTAINTY"],
        issueTemplateIds: [],
        evidenceIds: ["E3", "E4", "E5"],
      }),
    ).toEqual(feedbackPlan);

    expect(() =>
      authorizeCaseBriefFeedbackPlan(
        feedbackRequest,
        {
          ...feedbackPlan,
          evidenceClaimLinks: [
            { evidenceId: "E3", studentSpan: "words the student never wrote", fit: "supports" },
          ],
        },
        {
          summaryTemplateIds: ["SUMMARY-SUPPORTED-INCOMPLETE"],
          rubricReasonIds: Object.values(feedbackPlan.rubricReasonIds),
          revisionPromptIds: ["REVISION-UNCERTAINTY"],
          issueTemplateIds: [],
          evidenceIds: ["E3", "E4", "E5"],
        },
      ),
    ).toThrow(/student span/i);

    expect(() =>
      authorizeCaseBriefFeedbackPlan(
        feedbackRequest,
        {
          ...feedbackPlan,
          concernSpans: [
            {
              kind: "source_fit",
              studentSpan: "route information changed the pursuit",
              issueTemplateId: "ISSUE-SOURCE-FIT",
              evidenceIds: ["E1"],
            },
          ],
        },
        {
          summaryTemplateIds: ["SUMMARY-SUPPORTED-INCOMPLETE"],
          rubricReasonIds: Object.values(feedbackPlan.rubricReasonIds),
          revisionPromptIds: ["REVISION-UNCERTAINTY"],
          issueTemplateIds: ["ISSUE-SOURCE-FIT"],
          evidenceIds: ["E1", "E3", "E4", "E5"],
        },
      ),
    ).toThrow(/not pinned/i);
  });
});
