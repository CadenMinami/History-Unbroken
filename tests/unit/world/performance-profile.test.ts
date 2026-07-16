import { describe, expect, it } from "vitest";

import { summarizeWorldRenderWindow } from "../../e2e/helpers/performance-profile";

describe("classroom performance frame summary", () => {
  it("includes a terminal frame stall that crosses the capture boundary", () => {
    const result = summarizeWorldRenderWindow(
      [
        { timestampMs: 100, fps: 60 },
        { timestampMs: 116.7, fps: 59.9 },
        { timestampMs: 417.9, fps: 3.3 },
      ],
      100,
      300,
    );

    expect(result.maxStallMs).toBeCloseTo(301.2, 5);
  });

  it("fails frame distribution and stall evidence when the renderer records nothing", () => {
    expect(summarizeWorldRenderWindow([], 100, 1_000)).toEqual({
      maxStallMs: 1_000,
      medianFps: 0,
      oneSecondFps: [0],
      p10Fps: 0,
    });
  });
});
