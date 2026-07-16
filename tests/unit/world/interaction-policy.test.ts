import { describe, expect, it } from "vitest";

import { authorizeWorldInteraction } from "@/lib/world/interaction-policy";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";

const manifest = loadVarennesSceneManifest();
const evidenceInteractable = manifest.interactables.find(
  (interactable) => interactable.canonicalTarget.targetType === "evidence",
);

if (!evidenceInteractable) {
  throw new Error("The scene fixture needs an evidence interactable.");
}

const validRequest = {
  interactableId: evidenceInteractable.interactableId,
  zoneId: evidenceInteractable.zoneId,
  interactionType: evidenceInteractable.interactionType,
  canonicalTarget: evidenceInteractable.canonicalTarget,
};

describe("world interaction policy", () => {
  it("allows an exact manifest-authorized request", () => {
    expect(authorizeWorldInteraction(manifest, validRequest)).toEqual({
      status: "allowed",
      request: validRequest,
    });
  });

  it("rejects an unknown interactable without synthesizing a target", () => {
    const decision = authorizeWorldInteraction(manifest, {
      ...validRequest,
      interactableId: "INTERACTABLE-UNKNOWN",
    });

    expect(decision).toEqual({
      status: "rejected",
      reason: "unknown_interactable",
    });
    expect(decision).not.toHaveProperty("canonicalTarget");
    expect(decision).not.toHaveProperty("request");
  });

  it.each([
    ["zone_mismatch", { zoneId: "bridge-approach" }],
    ["interaction_type_mismatch", { interactionType: "open_caseboard" }],
    [
      "canonical_target_mismatch",
      { canonicalTarget: { targetType: "evidence", evidenceId: "E999" } },
    ],
  ] as const)("fails closed on %s", (reason, replacement) => {
    const decision = authorizeWorldInteraction(manifest, {
      ...validRequest,
      ...replacement,
    });

    expect(decision).toEqual({ status: "rejected", reason });
  });

  it("rejects malformed requests as data, not as an exception", () => {
    expect(
      authorizeWorldInteraction(manifest, {
        ...validRequest,
        zoneId: "unknown-zone",
        injectedFallbackId: "E3",
      }),
    ).toEqual({ status: "rejected", reason: "invalid_request" });
  });
});
