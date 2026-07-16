import { describe, expect, it, vi } from "vitest";

import { subscribeToWebGLContextLoss } from "@/lib/world/webgl-context-loss";

describe("WebGL context-loss subscription", () => {
  it("reports an active context loss and ignores teardown after cleanup", () => {
    const canvas = document.createElement("canvas");
    const onContextLost = vi.fn();
    const unsubscribe = subscribeToWebGLContextLoss(canvas, onContextLost);

    const activeLoss = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(activeLoss);

    expect(activeLoss.defaultPrevented).toBe(true);
    expect(onContextLost).toHaveBeenCalledOnce();

    unsubscribe();
    const teardownLoss = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(teardownLoss);

    expect(teardownLoss.defaultPrevented).toBe(false);
    expect(onContextLost).toHaveBeenCalledOnce();
  });
});
