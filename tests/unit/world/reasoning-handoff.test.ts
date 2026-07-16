import { describe, expect, it } from "vitest";

import {
  decideReasoningHandoff,
  type ReasoningHandoffRequest,
} from "@/lib/world/reasoning-handoff";
import { createWorldModeState, type WorldModeState } from "@/lib/world/world-mode";
import type { CaseState } from "@/schemas/case-state";

const casePhase = (phase: CaseState["phase"]): Pick<CaseState, "phase"> => ({ phase });

describe("reasoning handoff policy", () => {
  it("opens the causal caseboard from exploration after the reducer enters case brief", () => {
    expect(
      decideReasoningHandoff(
        casePhase("case_brief"),
        createWorldModeState(),
        { type: "open_caseboard" },
      ),
    ).toEqual({
      allowed: true,
      state: { mode: "focused", resumeMode: null },
    });
  });

  it.each<CaseState["phase"]>([
    "primer",
    "fracture",
    "investigation",
    "repair",
    "debrief",
  ])("does not open the caseboard during the %s phase", (phase) => {
    const worldMode = createWorldModeState();

    expect(
      decideReasoningHandoff(casePhase(phase), worldMode, {
        type: "open_caseboard",
      }),
    ).toEqual({
      allowed: false,
      reason: "case_phase_not_allowed",
      state: worldMode,
    });
  });

  it.each<WorldModeState["mode"]>([
    "focused",
    "cinematic",
    "repair",
    "suspended",
  ])("does not open the caseboard from %s world mode", (mode) => {
    const worldMode: WorldModeState = {
      mode,
      resumeMode: mode === "suspended" ? "exploring" : null,
    };

    expect(
      decideReasoningHandoff(casePhase("case_brief"), worldMode, {
        type: "open_caseboard",
      }),
    ).toEqual({
      allowed: false,
      reason: "world_transition_not_allowed",
      state: worldMode,
    });
  });

  it("returns from the focused caseboard to exploration", () => {
    expect(
      decideReasoningHandoff(
        casePhase("case_brief"),
        { mode: "focused", resumeMode: null },
        { type: "return_to_exploration" },
      ),
    ).toEqual({
      allowed: true,
      state: { mode: "exploring", resumeMode: null },
    });
  });

  it.each<WorldModeState>([
    { mode: "exploring", resumeMode: null },
    { mode: "cinematic", resumeMode: null },
    { mode: "repair", resumeMode: null },
    { mode: "suspended", resumeMode: "focused" },
  ])("does not use a caseboard close to leave $mode world mode", (worldMode) => {
    expect(
      decideReasoningHandoff(casePhase("case_brief"), worldMode, {
        type: "return_to_exploration",
      }),
    ).toEqual({
      allowed: false,
      reason: "world_transition_not_allowed",
      state: worldMode,
    });
  });

  it("does not resume exploration after case authority advances to repair", () => {
    const worldMode = { mode: "focused", resumeMode: null } as const;

    expect(
      decideReasoningHandoff(casePhase("repair"), worldMode, {
        type: "return_to_exploration",
      }),
    ).toEqual({
      allowed: false,
      reason: "case_phase_not_allowed",
      state: worldMode,
    });
  });

  it("fails closed for an unknown handoff request", () => {
    const worldMode = createWorldModeState();

    expect(
      decideReasoningHandoff(
        casePhase("case_brief"),
        worldMode,
        { type: "invent_case_progress" } as unknown as ReasoningHandoffRequest,
      ),
    ).toEqual({
      allowed: false,
      reason: "invalid_request",
      state: worldMode,
    });
  });

  it("fails closed when a handoff request contains unrecognized fields", () => {
    const worldMode = createWorldModeState();

    expect(
      decideReasoningHandoff(casePhase("case_brief"), worldMode, {
        type: "open_caseboard",
        fallbackPhase: "repair",
      }),
    ).toEqual({
      allowed: false,
      reason: "invalid_request",
      state: worldMode,
    });
  });
});
