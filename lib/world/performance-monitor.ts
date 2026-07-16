import {
  nextLowerGraphicsTier,
  type GraphicsTier,
} from "@/lib/world/graphics-profile";

export const PERFORMANCE_SAMPLE_WINDOW_MS = 1_000;
export const DOWNGRADE_FPS_THRESHOLD = 28;
export const DOWNGRADE_DURATION_MS = 3_000;
export const NON_SPATIAL_OFFER_FPS_THRESHOLD = 24;
export const NON_SPATIAL_OFFER_DURATION_MS = 5_000;

export type PerformanceSample = Readonly<{
  timestampMs: number;
  fps: number;
}>;

export type PerformanceMonitorState = Readonly<{
  tier: GraphicsTier;
  samples: readonly PerformanceSample[];
  belowDowngradeSinceMs: number | null;
  belowNonSpatialSinceMs: number | null;
  nonSpatialOfferIssued: boolean;
}>;

export type PerformanceMonitorEvent =
  | Readonly<{
      type: "graphics_tier_downgraded";
      from: GraphicsTier;
      to: GraphicsTier;
    }>
  | Readonly<{
      type: "offer_non_spatial_route";
    }>;

export type PerformanceMonitorResult = Readonly<{
  state: PerformanceMonitorState;
  averageFps: number;
  event: PerformanceMonitorEvent | null;
}>;

export function createPerformanceMonitor(
  tier: GraphicsTier,
): PerformanceMonitorState {
  return {
    tier,
    samples: [],
    belowDowngradeSinceMs: null,
    belowNonSpatialSinceMs: null,
    nonSpatialOfferIssued: false,
  };
}

function rollingSamples(
  samples: readonly PerformanceSample[],
  current: PerformanceSample,
): { samples: readonly PerformanceSample[]; averageFps: number } {
  const windowStart = current.timestampMs - PERFORMANCE_SAMPLE_WINDOW_MS;
  let firstRetainedIndex = 0;
  while (
    firstRetainedIndex < samples.length &&
    samples[firstRetainedIndex].timestampMs < windowStart
  ) {
    firstRetainedIndex += 1;
  }

  const retainedCount = samples.length - firstRetainedIndex;
  const nextSamples = new Array<PerformanceSample>(retainedCount + 1);
  let totalFps = current.fps;
  for (let index = 0; index < retainedCount; index += 1) {
    const sample = samples[firstRetainedIndex + index];
    nextSamples[index] = sample;
    totalFps += sample.fps;
  }
  nextSamples[retainedCount] = current;

  return {
    samples: nextSamples,
    averageFps: totalFps / nextSamples.length,
  };
}

export function recordPerformanceSample(
  state: PerformanceMonitorState,
  sample: PerformanceSample,
): PerformanceMonitorResult {
  const rolling = rollingSamples(state.samples, sample);
  const samples = rolling.samples;
  const rollingAverageFps = rolling.averageFps;

  if (state.tier === "classroom") {
    const belowNonSpatialSinceMs =
      rollingAverageFps < NON_SPATIAL_OFFER_FPS_THRESHOLD
        ? (state.belowNonSpatialSinceMs ?? sample.timestampMs)
        : null;
    const shouldOfferNonSpatial =
      !state.nonSpatialOfferIssued &&
      belowNonSpatialSinceMs !== null &&
      sample.timestampMs - belowNonSpatialSinceMs >=
        NON_SPATIAL_OFFER_DURATION_MS;

    return {
      state: {
        ...state,
        samples,
        belowDowngradeSinceMs: null,
        belowNonSpatialSinceMs,
        nonSpatialOfferIssued:
          state.nonSpatialOfferIssued || shouldOfferNonSpatial,
      },
      averageFps: rollingAverageFps,
      event: shouldOfferNonSpatial
        ? { type: "offer_non_spatial_route" }
        : null,
    };
  }

  const belowDowngradeSinceMs =
    rollingAverageFps < DOWNGRADE_FPS_THRESHOLD
      ? (state.belowDowngradeSinceMs ?? sample.timestampMs)
      : null;
  const shouldDowngrade =
    belowDowngradeSinceMs !== null &&
    sample.timestampMs - belowDowngradeSinceMs >= DOWNGRADE_DURATION_MS;

  if (shouldDowngrade) {
    const nextTier = nextLowerGraphicsTier(state.tier);
    return {
      state: {
        ...createPerformanceMonitor(nextTier),
      },
      averageFps: rollingAverageFps,
      event: {
        type: "graphics_tier_downgraded",
        from: state.tier,
        to: nextTier,
      },
    };
  }

  return {
    state: {
      ...state,
      samples,
      belowDowngradeSinceMs,
      belowNonSpatialSinceMs: null,
    },
    averageFps: rollingAverageFps,
    event: null,
  };
}
