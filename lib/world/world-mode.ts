export const WORLD_MODES = [
  "exploring",
  "focused",
  "cinematic",
  "repair",
  "suspended",
] as const;

export type WorldMode = (typeof WORLD_MODES)[number];
export type ResumableWorldMode = Exclude<WorldMode, "suspended">;

export type WorldModeState = Readonly<{
  mode: WorldMode;
  resumeMode: ResumableWorldMode | null;
}>;

export type WorldModeEvent =
  | Readonly<{ type: "open_focus" }>
  | Readonly<{ type: "start_cinematic" }>
  | Readonly<{ type: "start_repair" }>
  | Readonly<{ type: "return_to_exploring" }>
  | Readonly<{ type: "suspend" }>
  | Readonly<{ type: "resume" }>;

export type WorldModeTransition =
  | Readonly<{ allowed: true; state: WorldModeState }>
  | Readonly<{
      allowed: false;
      reason: "transition_not_allowed";
      state: WorldModeState;
    }>;

export function createWorldModeState(): WorldModeState {
  return { mode: "exploring", resumeMode: null };
}

function allowed(state: WorldModeState): WorldModeTransition {
  return { allowed: true, state };
}

function rejected(state: WorldModeState): WorldModeTransition {
  return { allowed: false, reason: "transition_not_allowed", state };
}

export function transitionWorldMode(
  state: WorldModeState,
  event: WorldModeEvent,
): WorldModeTransition {
  if (event.type === "suspend") {
    if (state.mode === "suspended") return rejected(state);
    return allowed({ mode: "suspended", resumeMode: state.mode });
  }

  if (event.type === "resume") {
    if (state.mode !== "suspended" || state.resumeMode === null) {
      return rejected(state);
    }
    return allowed({ mode: state.resumeMode, resumeMode: null });
  }

  if (event.type === "return_to_exploring") {
    if (
      state.mode !== "focused" &&
      state.mode !== "cinematic" &&
      state.mode !== "repair"
    ) {
      return rejected(state);
    }
    return allowed(createWorldModeState());
  }

  if (state.mode !== "exploring") return rejected(state);

  if (event.type === "open_focus") {
    return allowed({ mode: "focused", resumeMode: null });
  }
  if (event.type === "start_cinematic") {
    return allowed({ mode: "cinematic", resumeMode: null });
  }
  return allowed({ mode: "repair", resumeMode: null });
}

export function canUseLocomotion(state: WorldModeState): boolean {
  return state.mode === "exploring";
}

export function canCaptureWorldPointer(state: WorldModeState): boolean {
  return state.mode === "exploring";
}
