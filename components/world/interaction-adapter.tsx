"use client";

import { useCallback } from "react";

import { useCaseSession } from "@/components/case-session/case-session-provider";
import type { ReducerResult } from "@/lib/case-engine/reducer";
import { authorizeWorldInteraction } from "@/lib/world/interaction-policy";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import type { WorldInteractionRequest } from "@/schemas/world-manifest";

const manifest = loadVarennesSceneManifest();

export type WorldInteractionOutcome =
  | Readonly<{
      status: "opened";
      target: Extract<
        WorldInteractionRequest["canonicalTarget"],
        | { targetType: "evidence" }
        | { targetType: "station" }
      > | Readonly<{ targetType: "case_surface"; surfaceId: "journal" }>;
      reducerResult: ReducerResult | null;
    }>
  | Readonly<{
      status: "rejected";
      reason: string;
    }>;

export function useWorldInteractionAdapter() {
  const { issue, state } = useCaseSession();

  return useCallback(
    (request: unknown): WorldInteractionOutcome => {
      const decision = authorizeWorldInteraction(manifest, request);
      if (decision.status === "rejected") return decision;

      const target = decision.request.canonicalTarget;
      if (target.targetType === "station") {
        return { status: "opened", target, reducerResult: null };
      }
      if (target.targetType === "case_surface" && target.surfaceId === "journal") {
        return {
          status: "opened",
          target: { targetType: "case_surface", surfaceId: "journal" },
          reducerResult: null,
        };
      }
      if (target.targetType !== "evidence") {
        return { status: "rejected", reason: "unsupported_target" };
      }

      const reducerResult = state.inspectedItemIds.includes(target.evidenceId)
        ? null
        : issue({ type: "inspect_item", itemId: target.evidenceId });
      if (reducerResult && reducerResult.status !== "applied") {
        return {
          status: "rejected",
          reason: reducerResult.reason ?? reducerResult.status,
        };
      }

      return { status: "opened", target, reducerResult };
    },
    [issue, state.inspectedItemIds],
  );
}
