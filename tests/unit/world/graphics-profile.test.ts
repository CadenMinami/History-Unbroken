import { describe, expect, it } from "vitest";

import {
  GRAPHICS_PROFILES,
  nextLowerGraphicsTier,
  selectInitialGraphicsTier,
} from "@/lib/world/graphics-profile";

describe("graphics profiles", () => {
  it("defines the high presentation profile", () => {
    expect(GRAPHICS_PROFILES.high).toEqual({
      tier: "high",
      dpr: 2,
      shadows: { enabled: true, mapSize: 2048 },
      fog: { near: 36, far: 150 },
      postProcessingAllowed: true,
      ambientCount: 16,
      textureTier: "high",
    });
  });

  it("defines the balanced presentation profile", () => {
    expect(GRAPHICS_PROFILES.balanced).toEqual({
      tier: "balanced",
      dpr: 1.5,
      shadows: { enabled: true, mapSize: 1024 },
      fog: { near: 30, far: 120 },
      postProcessingAllowed: true,
      ambientCount: 8,
      textureTier: "medium",
    });
  });

  it("defines the classroom presentation profile", () => {
    expect(GRAPHICS_PROFILES.classroom).toEqual({
      tier: "classroom",
      dpr: 1,
      shadows: { enabled: false, mapSize: 0 },
      fog: { near: 24, far: 90 },
      postProcessingAllowed: false,
      ambientCount: 3,
      textureTier: "low",
    });
  });

  it("keeps profile fields limited to presentation quality", () => {
    expect(Object.keys(GRAPHICS_PROFILES.high).sort()).toEqual([
      "ambientCount",
      "dpr",
      "fog",
      "postProcessingAllowed",
      "shadows",
      "textureTier",
      "tier",
    ]);
  });

  it("defaults unknown hardware to the balanced tier", () => {
    expect(selectInitialGraphicsTier({})).toBe("balanced");
  });

  it.each([
    [{ deviceMemoryGb: 4, hardwareConcurrency: 8 }],
    [{ deviceMemoryGb: 8, hardwareConcurrency: 4 }],
  ])("selects classroom for a known constrained signal", (capabilities) => {
    expect(selectInitialGraphicsTier(capabilities)).toBe("classroom");
  });

  it("selects high only when both hardware signals are strong", () => {
    expect(
      selectInitialGraphicsTier({ deviceMemoryGb: 8, hardwareConcurrency: 8 }),
    ).toBe("high");
    expect(selectInitialGraphicsTier({ deviceMemoryGb: 8 })).toBe("balanced");
    expect(selectInitialGraphicsTier({ hardwareConcurrency: 8 })).toBe(
      "balanced",
    );
  });

  it("steps down one tier without going below classroom", () => {
    expect(nextLowerGraphicsTier("high")).toBe("balanced");
    expect(nextLowerGraphicsTier("balanced")).toBe("classroom");
    expect(nextLowerGraphicsTier("classroom")).toBe("classroom");
  });
});
