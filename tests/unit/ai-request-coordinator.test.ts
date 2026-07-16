import { describe, expect, it } from "vitest";

import { AIRequestCoordinator } from "@/lib/openai/ai-request-coordinator";
import { AI_CONTRACT_VERSION } from "@/schemas/ai-contracts";

const firstMetadata = {
  contractVersion: AI_CONTRACT_VERSION,
  caseId: "varennes",
  caseSchemaVersion: "1.0.0",
  caseVersion: "1.0.3",
  policyVersion: "1.0.0",
  stateVersion: "1.2.0",
  promptVersion: "character-turn-v1",
  requestId: "00000000-0000-4000-8000-000000000001",
  stateRevision: 4,
};

describe("AIRequestCoordinator", () => {
  it("uses the only active AI contract version", () => {
    expect(firstMetadata.contractVersion).toBe("1.1.0");
  });

  it("aborts a superseded request and accepts only the current correlation metadata", () => {
    const coordinator = new AIRequestCoordinator();
    const first = coordinator.begin(firstMetadata);
    const secondMetadata = {
      ...firstMetadata,
      requestId: "00000000-0000-4000-8000-000000000002",
      stateRevision: 5,
    };
    const second = coordinator.begin(secondMetadata);

    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    expect(coordinator.isCurrent(firstMetadata)).toBe(false);
    expect(coordinator.isCurrent(secondMetadata)).toBe(true);
  });

  it("silently invalidates the current request on reset or navigation", () => {
    const coordinator = new AIRequestCoordinator();
    const request = coordinator.begin(firstMetadata);

    coordinator.invalidate();

    expect(request.signal.aborted).toBe(true);
    expect(coordinator.isCurrent(firstMetadata)).toBe(false);
  });
});
