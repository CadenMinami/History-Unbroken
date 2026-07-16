import { describe, expect, it } from "vitest";

import {
  canCaptureWorldPointer,
  canUseLocomotion,
  createWorldModeState,
  transitionWorldMode,
  type ResumableWorldMode,
} from "@/lib/world/world-mode";

describe("world mode state machine", () => {
  it.each([
    ["open_focus", "focused"],
    ["start_cinematic", "cinematic"],
    ["start_repair", "repair"],
    ["suspend", "suspended"],
  ] as const)("moves from exploring on %s", (event, expectedMode) => {
    const result = transitionWorldMode(createWorldModeState(), { type: event });

    expect(result).toMatchObject({ allowed: true, state: { mode: expectedMode } });
  });

  it.each(["focused", "cinematic", "repair"] as const)(
    "returns from %s to exploring",
    (mode) => {
      const result = transitionWorldMode(
        { mode, resumeMode: null },
        { type: "return_to_exploring" },
      );

      expect(result).toEqual({
        allowed: true,
        state: { mode: "exploring", resumeMode: null },
      });
    },
  );

  it("suspends and restores the prior interaction mode", () => {
    const suspended = transitionWorldMode(
      { mode: "cinematic", resumeMode: null },
      { type: "suspend" },
    );

    expect(suspended).toEqual({
      allowed: true,
      state: { mode: "suspended", resumeMode: "cinematic" },
    });

    expect(
      transitionWorldMode(suspended.state, { type: "resume" }),
    ).toEqual({
      allowed: true,
      state: { mode: "cinematic", resumeMode: null },
    });
  });

  it("fails closed for illegal transitions without mutating state", () => {
    const initial = { mode: "focused", resumeMode: null } as const;
    const before = structuredClone(initial);
    const result = transitionWorldMode(initial, { type: "start_repair" });

    expect(result).toEqual({
      allowed: false,
      reason: "transition_not_allowed",
      state: initial,
    });
    expect(initial).toEqual(before);
  });

  it.each([
    ["exploring", true],
    ["focused", false],
    ["cinematic", false],
    ["repair", false],
    ["suspended", false],
  ] as const)("gates world input in %s", (mode, expected) => {
    const state = { mode, resumeMode: null };

    expect(canUseLocomotion(state)).toBe(expected);
    expect(canCaptureWorldPointer(state)).toBe(expected);
  });

  it.each<ResumableWorldMode>(["exploring", "focused", "cinematic", "repair"])(
    "does not overwrite the saved mode when already suspended from %s",
    (resumeMode) => {
      const state = { mode: "suspended", resumeMode } as const;
      const result = transitionWorldMode(state, { type: "suspend" });

      expect(result).toEqual({
        allowed: false,
        reason: "transition_not_allowed",
        state,
      });
    },
  );
});
