import type { CaseState } from "@/schemas/case-state";

import {
  transitionWorldMode,
  type WorldModeState,
  type WorldModeTransition,
} from "./world-mode";

export type ReasoningHandoffRequest =
  | Readonly<{ type: "open_caseboard" }>
  | Readonly<{ type: "return_to_exploration" }>;

export type ReasoningHandoffRejectionReason =
  | "invalid_request"
  | "case_phase_not_allowed"
  | "world_transition_not_allowed";

export type ReasoningHandoffDecision =
  | Extract<WorldModeTransition, { allowed: true }>
  | Readonly<{
      allowed: false;
      reason: ReasoningHandoffRejectionReason;
      state: WorldModeState;
    }>;

function reject(
  state: WorldModeState,
  reason: ReasoningHandoffRejectionReason,
): ReasoningHandoffDecision {
  return { allowed: false, reason, state };
}

function requestType(request: unknown): ReasoningHandoffRequest["type"] | null {
  if (
    typeof request !== "object" ||
    request === null ||
    !("type" in request) ||
    Object.keys(request).length !== 1
  ) {
    return null;
  }

  const type = request.type;
  return type === "open_caseboard" || type === "return_to_exploration" ? type : null;
}

function applyWorldTransition(
  state: WorldModeState,
  event: Parameters<typeof transitionWorldMode>[1],
): ReasoningHandoffDecision {
  const transition = transitionWorldMode(state, event);
  return transition.allowed
    ? transition
    : reject(transition.state, "world_transition_not_allowed");
}

export function decideReasoningHandoff(
  caseState: Pick<CaseState, "phase">,
  worldModeState: WorldModeState,
  request: unknown,
): ReasoningHandoffDecision {
  const type = requestType(request);
  if (type === null) return reject(worldModeState, "invalid_request");
  if (caseState.phase !== "case_brief") {
    return reject(worldModeState, "case_phase_not_allowed");
  }

  if (type === "open_caseboard") {
    return applyWorldTransition(worldModeState, { type: "open_focus" });
  }

  if (worldModeState.mode !== "focused") {
    return reject(worldModeState, "world_transition_not_allowed");
  }
  return applyWorldTransition(worldModeState, { type: "return_to_exploring" });
}

type WorldReasoningHandoff = {
  href: "/play" | "/play/investigate" | "/play/caseboard" | "/play/repair" | "/play/debrief";
  label: string;
  command: { type: "advance_phase"; phase: "case_brief" } | null;
};

export function getWorldReasoningHandoff(
  state: Pick<CaseState, "phase">,
  investigationComplete: boolean,
): WorldReasoningHandoff {
  switch (state.phase) {
    case "primer":
    case "fracture":
      return {
        href: "/play",
        label: "Return to case briefing",
        command: null,
      };
    case "investigation":
      return investigationComplete
        ? {
            href: "/play/caseboard",
            label: "Build causal caseboard",
            command: { type: "advance_phase", phase: "case_brief" },
          }
        : {
            href: "/play/investigate",
            label: "Open case file",
            command: null,
          };
    case "case_brief":
      return {
        href: "/play/caseboard",
        label: "Open causal caseboard",
        command: null,
      };
    case "repair":
      return {
        href: "/play/repair",
        label: "Continue timeline repair",
        command: null,
      };
    case "debrief":
      return {
        href: "/play/debrief",
        label: "Open learning summary",
        command: null,
      };
  }
}
