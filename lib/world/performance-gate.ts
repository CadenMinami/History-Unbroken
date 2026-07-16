export const PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS = Object.freeze({
  initialCompressedBytes: 15_000_000,
  interactiveMs: 8_000,
  medianFps: 30,
  p10Fps: 24,
  maxPostLoadStallMs: 250,
  canvasNonBlank: true,
} as const);

export type PhaseOneArchivePerformanceReport = Readonly<{
  initialCompressedBytes: number;
  interactiveMs: number;
  medianFps: number;
  p10Fps: number;
  maxPostLoadStallMs: number;
  canvasNonBlank: boolean;
}>;

export type NumericPerformanceMetricResult = Readonly<{
  actual: number;
  threshold: number;
  comparison: "at_most" | "at_least";
  valid: boolean;
  passed: boolean;
}>;

export type BooleanPerformanceMetricResult = Readonly<{
  actual: boolean;
  expected: boolean;
  comparison: "equals";
  valid: boolean;
  passed: boolean;
}>;

export type PhaseOneArchivePerformanceMetricResults = Readonly<{
  initialCompressedBytes: NumericPerformanceMetricResult;
  interactiveMs: NumericPerformanceMetricResult;
  medianFps: NumericPerformanceMetricResult;
  p10Fps: NumericPerformanceMetricResult;
  maxPostLoadStallMs: NumericPerformanceMetricResult;
  canvasNonBlank: BooleanPerformanceMetricResult;
}>;

export type PhaseOneArchivePerformanceGateResult = Readonly<{
  passed: boolean;
  metrics: PhaseOneArchivePerformanceMetricResults;
  failures: readonly string[];
}>;

function evaluateNumericMetric(
  actual: number,
  threshold: number,
  comparison: "at_most" | "at_least",
): NumericPerformanceMetricResult {
  const valid = Number.isFinite(actual) && actual >= 0;
  const passed =
    valid &&
    (comparison === "at_most" ? actual <= threshold : actual >= threshold);

  return Object.freeze({ actual, threshold, comparison, valid, passed });
}

function evaluateBooleanMetric(
  actual: boolean,
  expected: boolean,
): BooleanPerformanceMetricResult {
  return Object.freeze({
    actual,
    expected,
    comparison: "equals",
    valid: true,
    passed: actual === expected,
  });
}

function numericFailure(
  label: string,
  metric: NumericPerformanceMetricResult,
  thresholdFailure: (actual: number) => string,
): string | null {
  if (!metric.valid) {
    return `${label} must be a finite nonnegative number; received ${String(metric.actual)}.`;
  }

  return metric.passed ? null : thresholdFailure(metric.actual);
}

export function evaluateArchivePerformance(
  report: PhaseOneArchivePerformanceReport,
): PhaseOneArchivePerformanceGateResult {
  const thresholds = PHASE_ONE_ARCHIVE_PERFORMANCE_THRESHOLDS;
  const metrics = Object.freeze({
    initialCompressedBytes: evaluateNumericMetric(
      report.initialCompressedBytes,
      thresholds.initialCompressedBytes,
      "at_most",
    ),
    interactiveMs: evaluateNumericMetric(
      report.interactiveMs,
      thresholds.interactiveMs,
      "at_most",
    ),
    medianFps: evaluateNumericMetric(
      report.medianFps,
      thresholds.medianFps,
      "at_least",
    ),
    p10Fps: evaluateNumericMetric(
      report.p10Fps,
      thresholds.p10Fps,
      "at_least",
    ),
    maxPostLoadStallMs: evaluateNumericMetric(
      report.maxPostLoadStallMs,
      thresholds.maxPostLoadStallMs,
      "at_most",
    ),
    canvasNonBlank: evaluateBooleanMetric(
      report.canvasNonBlank,
      thresholds.canvasNonBlank,
    ),
  });

  const failures = Object.freeze(
    [
      numericFailure(
        "Initial compressed transfer",
        metrics.initialCompressedBytes,
        (actual) =>
          `Initial compressed transfer must be at most 15 MB (${thresholds.initialCompressedBytes} bytes); received ${String(actual)} bytes.`,
      ),
      numericFailure(
        "Archive interactivity",
        metrics.interactiveMs,
        (actual) =>
          `Archive interactivity must be at most ${thresholds.interactiveMs} ms; received ${String(actual)} ms.`,
      ),
      numericFailure("Median frame rate", metrics.medianFps, (actual) =>
        `Median frame rate must be at least ${thresholds.medianFps} FPS; received ${String(actual)} FPS.`,
      ),
      numericFailure(
        "10th-percentile frame rate",
        metrics.p10Fps,
        (actual) =>
          `10th-percentile frame rate must be at least ${thresholds.p10Fps} FPS; received ${String(actual)} FPS.`,
      ),
      numericFailure(
        "Maximum post-load stall",
        metrics.maxPostLoadStallMs,
        (actual) =>
          `Maximum post-load stall must be at most ${thresholds.maxPostLoadStallMs} ms; received ${String(actual)} ms.`,
      ),
      metrics.canvasNonBlank.passed
        ? null
        : "Canvas must be nonblank; received a blank canvas.",
    ].filter((failure): failure is string => failure !== null),
  );

  return Object.freeze({
    passed: failures.length === 0,
    metrics,
    failures,
  });
}
