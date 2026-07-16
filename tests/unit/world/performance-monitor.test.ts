import { describe, expect, it } from "vitest";

import {
  createPerformanceMonitor,
  recordPerformanceSample,
  type PerformanceMonitorState,
} from "@/lib/world/performance-monitor";

function record(
  state: PerformanceMonitorState,
  timestampMs: number,
  fps: number,
) {
  return recordPerformanceSample(state, { timestampMs, fps });
}

describe("performance monitor", () => {
  it.each([
    ["high", "balanced"],
    ["balanced", "classroom"],
  ] as const)(
    "downgrades %s after the rolling average stays below 28 FPS for 3 seconds",
    (initialTier, expectedTier) => {
      let state = createPerformanceMonitor(initialTier);

      let result = record(state, 0, 27);
      state = result.state;
      result = record(state, 2_999, 27);

      expect(result.state.tier).toBe(initialTier);
      expect(result.event).toBeNull();

      result = record(result.state, 3_000, 27);

      expect(result.state.tier).toBe(expectedTier);
      expect(result.event).toEqual({
        type: "graphics_tier_downgraded",
        from: initialTier,
        to: expectedTier,
      });
    },
  );

  it("does not downgrade at exactly 28 FPS", () => {
    let state = createPerformanceMonitor("high");

    state = record(state, 0, 28).state;
    const result = record(state, 3_000, 28);

    expect(result.state.tier).toBe("high");
    expect(result.event).toBeNull();
  });

  it("resets the downgrade timer when the rolling average recovers", () => {
    let state = createPerformanceMonitor("high");

    state = record(state, 0, 27).state;
    state = record(state, 1_000, 27).state;
    state = record(state, 2_000, 60).state;
    state = record(state, 3_001, 27).state;

    expect(record(state, 6_000, 27).event).toBeNull();

    const result = record(state, 6_001, 27);
    expect(result.state.tier).toBe("balanced");
  });

  it("uses only samples in the rolling window", () => {
    let state = createPerformanceMonitor("high");

    state = record(state, 0, 60).state;
    state = record(state, 1_001, 27).state;
    const result = record(state, 4_001, 27);

    expect(result.averageFps).toBe(27);
    expect(result.state.tier).toBe("balanced");
  });

  it("offers the non-spatial route after classroom stays below 24 FPS for 5 seconds", () => {
    let state = createPerformanceMonitor("classroom");

    state = record(state, 0, 23).state;
    const beforeThreshold = record(state, 4_999, 23);

    expect(beforeThreshold.event).toBeNull();
    expect(beforeThreshold.state.nonSpatialOfferIssued).toBe(false);

    const result = record(beforeThreshold.state, 5_000, 23);

    expect(result.event).toEqual({ type: "offer_non_spatial_route" });
    expect(result.state.nonSpatialOfferIssued).toBe(true);
  });

  it("does not offer the non-spatial route at exactly 24 FPS", () => {
    let state = createPerformanceMonitor("classroom");

    state = record(state, 0, 24).state;
    const result = record(state, 5_000, 24);

    expect(result.event).toBeNull();
    expect(result.state.nonSpatialOfferIssued).toBe(false);
  });

  it("emits the non-spatial offer only once", () => {
    let state = createPerformanceMonitor("classroom");

    state = record(state, 0, 23).state;
    state = record(state, 5_000, 23).state;
    const result = record(state, 6_000, 23);

    expect(result.event).toBeNull();
    expect(result.state.nonSpatialOfferIssued).toBe(true);
  });

  it("starts a fresh monitoring period after each downgrade", () => {
    let state = createPerformanceMonitor("high");

    state = record(state, 0, 20).state;
    state = record(state, 3_000, 20).state;
    expect(state.tier).toBe("balanced");

    state = record(state, 3_001, 20).state;
    state = record(state, 6_001, 20).state;
    expect(state.tier).toBe("classroom");
    expect(state.nonSpatialOfferIssued).toBe(false);

    state = record(state, 6_002, 20).state;
    expect(record(state, 11_001, 20).event).toBeNull();
    expect(record(state, 11_002, 20).event).toEqual({
      type: "offer_non_spatial_route",
    });
  });

  it("is deterministic and does not mutate prior state", () => {
    const initial = createPerformanceMonitor("balanced");
    const before = structuredClone(initial);
    const sample = { timestampMs: 1_000, fps: 27 };

    const first = recordPerformanceSample(initial, sample);
    const second = recordPerformanceSample(initial, sample);

    expect(first).toEqual(second);
    expect(initial).toEqual(before);
  });

  it("constructs the rolling window without intermediate array transforms", () => {
    const state = record(createPerformanceMonitor("high"), 500, 60).state;
    const guardedSamples = new Proxy(state.samples, {
      get(target, property, receiver) {
        if (property === "filter" || property === "reduce") {
          throw new Error(`Unexpected ${String(property)} call`);
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const result = recordPerformanceSample(
      { ...state, samples: guardedSamples },
      { timestampMs: 1_500, fps: 30 },
    );

    expect(result.state.samples).toEqual([
      { timestampMs: 500, fps: 60 },
      { timestampMs: 1_500, fps: 30 },
    ]);
    expect(result.averageFps).toBe(45);
  });
});
