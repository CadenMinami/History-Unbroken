import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import { buildAIRequestMetadata } from "@/lib/openai/request-metadata";
import {
  AI_CONTRACT_VERSION,
  CHARACTER_PROMPT_VERSION,
  MODEL_POLICY_VERSION,
} from "@/schemas/ai-contracts";

describe("buildAIRequestMetadata", () => {
  it("derives correlation versions from the validated case and state", () => {
    const casePackage = loadVarennesCase();
    const state = createInitialCaseState(casePackage);

    expect(
      buildAIRequestMetadata(casePackage, state, CHARACTER_PROMPT_VERSION, () =>
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      contractVersion: "1.1.0",
      caseId: "varennes",
      caseSchemaVersion: "1.0.0",
      caseVersion: "1.0.3",
      policyVersion: MODEL_POLICY_VERSION,
      stateVersion: "1.2.0",
      promptVersion: CHARACTER_PROMPT_VERSION,
      requestId: "00000000-0000-4000-8000-000000000001",
      stateRevision: 0,
    });
    expect(AI_CONTRACT_VERSION).toBe("1.1.0");
  });
});
