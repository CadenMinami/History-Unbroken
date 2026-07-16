import { describe, expect, it } from "vitest";

import {
  evaluateArchivePerformance,
  PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS,
  type PhaseOneArchivePerformanceReport,
} from "@/lib/world/performance-gate";

const PASSING_REPORT: PhaseOneArchivePerformanceReport = {
  initialCompressedBytes: 15_000_000,
  interactiveMs: 8_000,
  medianFps: 30,
  p10Fps: 24,
  maxPostLoadStallMs: 250,
  canvasNonBlank: true,
};

const NUMERIC_METRICS = [
  {
    metric: "initialCompressedBytes",
    label: "Initial compressed transfer",
  },
  { metric: "interactiveMs", label: "Archive interactivity" },
  { metric: "medianFps", label: "Median frame rate" },
  { metric: "p10Fps", label: "10th-percentile frame rate" },
  { metric: "maxPostLoadStallMs", label: "Maximum post-load stall" },
] as const;

const INVALID_NUMBERS = [
  { value: Number.NaN, display: "NaN" },
  { value: Number.POSITIVE_INFINITY, display: "Infinity" },
  { value: Number.NEGATIVE_INFINITY, display: "-Infinity" },
  { value: -1, display: "-1" },
] as const;

const INVALID_METRIC_CASES = NUMERIC_METRICS.flatMap(({ metric, label }) =>
  INVALID_NUMBERS.map(({ value, display }) => ({
    metric,
    label,
    value,
    display,
  })),
);

describe("Phase 1 archive performance gate", () => {
  it("passes a report exactly at every approved threshold", () => {
    expect(evaluateArchivePerformance(PASSING_REPORT)).toEqual({
      passed: true,
      metrics: {
        initialCompressedBytes: {
          actual: 15_000_000,
          threshold: 15_000_000,
          comparison: "at_most",
          valid: true,
          passed: true,
        },
        interactiveMs: {
          actual: 8_000,
          threshold: 8_000,
          comparison: "at_most",
          valid: true,
          passed: true,
        },
        medianFps: {
          actual: 30,
          threshold: 30,
          comparison: "at_least",
          valid: true,
          passed: true,
        },
        p10Fps: {
          actual: 24,
          threshold: 24,
          comparison: "at_least",
          valid: true,
          passed: true,
        },
        maxPostLoadStallMs: {
          actual: 250,
          threshold: 250,
          comparison: "at_most",
          valid: true,
          passed: true,
        },
        canvasNonBlank: {
          actual: true,
          expected: true,
          comparison: "equals",
          valid: true,
          passed: true,
        },
      },
      failures: [],
    });
  });

  it("reports every failed metric in a stable human-readable order", () => {
    const result = evaluateArchivePerformance({
      initialCompressedBytes:
        PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS.initialCompressedBytes + 1,
      interactiveMs:
        PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS.interactiveMs + 1,
      medianFps: PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS.medianFps - 1,
      p10Fps: PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS.p10Fps - 1,
      maxPostLoadStallMs:
        PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS.maxPostLoadStallMs + 1,
      canvasNonBlank: false,
    });

    expect(result.passed).toBe(false);
    expect(
      Object.fromEntries(
        Object.entries(result.metrics).map(([name, metric]) => [
          name,
          metric.passed,
        ]),
      ),
    ).toEqual({
      initialCompressedBytes: false,
      interactiveMs: false,
      medianFps: false,
      p10Fps: false,
      maxPostLoadStallMs: false,
      canvasNonBlank: false,
    });
    expect(result.failures).toEqual([
      "Initial compressed transfer must be at most 15 MB (15000000 bytes); received 15000001 bytes.",
      "Archive interactivity must be at most 8000 ms; received 8001 ms.",
      "Median frame rate must be at least 30 FPS; received 29 FPS.",
      "10th-percentile frame rate must be at least 24 FPS; received 23 FPS.",
      "Maximum post-load stall must be at most 250 ms; received 251 ms.",
      "Canvas must be nonblank; received a blank canvas.",
    ]);
  });

  it.each(INVALID_METRIC_CASES)(
    "rejects $display for $metric",
    ({ metric, label, value, display }) => {
      const report: PhaseOneArchivePerformanceReport = {
        ...PASSING_REPORT,
        [metric]: value,
      };

      const result = evaluateArchivePerformance(report);

      expect(result.passed).toBe(false);
      expect(result.metrics[metric]).toMatchObject({
        actual: value,
        valid: false,
        passed: false,
      });
      expect(result.failures).toEqual([
        `${label} must be a finite nonnegative number; received ${display}.`,
      ]);
    },
  );

  it("is deterministic, leaves the report untouched, and freezes its result", () => {
    const report: PhaseOneArchivePerformanceReport = {
      ...PASSING_REPORT,
      medianFps: 31,
    };
    const before = structuredClone(report);

    const first = evaluateArchivePerformance(report);
    const second = evaluateArchivePerformance(report);

    expect(first).toEqual(second);
    expect(report).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.metrics)).toBe(true);
    expect(Object.isFrozen(first.failures)).toBe(true);
    expect(
      Object.values(first.metrics).every((metric) => Object.isFrozen(metric)),
    ).toBe(true);
  });
});
