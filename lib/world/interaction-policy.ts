import {
  type CanonicalTarget,
  type SceneManifest,
  type WorldInteractionRequest,
  worldInteractionRequestSchema,
} from "@/schemas/world-manifest";

export type InteractionRejectionReason =
  | "invalid_request"
  | "unknown_interactable"
  | "zone_mismatch"
  | "interaction_type_mismatch"
  | "canonical_target_mismatch";

export type WorldInteractionDecision =
  | {
      status: "allowed";
      request: WorldInteractionRequest;
    }
  | {
      status: "rejected";
      reason: InteractionRejectionReason;
    };

function targetsMatch(left: CanonicalTarget, right: CanonicalTarget): boolean {
  if (left.targetType !== right.targetType) return false;

  switch (left.targetType) {
    case "evidence":
      return right.targetType === "evidence" && left.evidenceId === right.evidenceId;
    case "station":
      return right.targetType === "station" && left.stationId === right.stationId;
    case "case_surface":
      return right.targetType === "case_surface" && left.surfaceId === right.surfaceId;
    case "repair_checkpoint":
      return (
        right.targetType === "repair_checkpoint" &&
        left.repairCheckpointId === right.repairCheckpointId
      );
  }
}

export function authorizeWorldInteraction(
  manifest: SceneManifest,
  request: unknown,
): WorldInteractionDecision {
  const parsed = worldInteractionRequestSchema.safeParse(request);
  if (!parsed.success) {
    return { status: "rejected", reason: "invalid_request" };
  }

  const authorized = manifest.interactables.find(
    (interactable) => interactable.interactableId === parsed.data.interactableId,
  );
  if (!authorized) {
    return { status: "rejected", reason: "unknown_interactable" };
  }
  if (authorized.zoneId !== parsed.data.zoneId) {
    return { status: "rejected", reason: "zone_mismatch" };
  }
  if (authorized.interactionType !== parsed.data.interactionType) {
    return { status: "rejected", reason: "interaction_type_mismatch" };
  }
  if (!targetsMatch(authorized.canonicalTarget, parsed.data.canonicalTarget)) {
    return { status: "rejected", reason: "canonical_target_mismatch" };
  }

  return { status: "allowed", request: parsed.data };
}
