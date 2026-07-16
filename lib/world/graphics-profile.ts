export const GRAPHICS_TIERS = ["high", "balanced", "classroom"] as const;

export type GraphicsTier = (typeof GRAPHICS_TIERS)[number];
export type TextureTier = "high" | "medium" | "low";

export type GraphicsProfile = Readonly<{
  tier: GraphicsTier;
  dpr: number;
  shadows: Readonly<{
    enabled: boolean;
    mapSize: number;
  }>;
  fog: Readonly<{
    near: number;
    far: number;
  }>;
  postProcessingAllowed: boolean;
  ambientCount: number;
  textureTier: TextureTier;
}>;

export type GraphicsCapabilities = Readonly<{
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
}>;

export const GRAPHICS_PROFILES = {
  high: {
    tier: "high",
    dpr: 2,
    shadows: { enabled: true, mapSize: 2048 },
    fog: { near: 36, far: 150 },
    postProcessingAllowed: true,
    ambientCount: 16,
    textureTier: "high",
  },
  balanced: {
    tier: "balanced",
    dpr: 1.5,
    shadows: { enabled: true, mapSize: 1024 },
    fog: { near: 30, far: 120 },
    postProcessingAllowed: true,
    ambientCount: 8,
    textureTier: "medium",
  },
  classroom: {
    tier: "classroom",
    dpr: 1,
    shadows: { enabled: false, mapSize: 0 },
    fog: { near: 24, far: 90 },
    postProcessingAllowed: false,
    ambientCount: 3,
    textureTier: "low",
  },
} as const satisfies Record<GraphicsTier, GraphicsProfile>;

export function selectInitialGraphicsTier(
  capabilities: GraphicsCapabilities,
): GraphicsTier {
  const { deviceMemoryGb, hardwareConcurrency } = capabilities;

  if (
    (deviceMemoryGb !== undefined && deviceMemoryGb <= 4) ||
    (hardwareConcurrency !== undefined && hardwareConcurrency <= 4)
  ) {
    return "classroom";
  }

  if (
    deviceMemoryGb !== undefined &&
    hardwareConcurrency !== undefined &&
    deviceMemoryGb >= 8 &&
    hardwareConcurrency >= 8
  ) {
    return "high";
  }

  return "balanced";
}

export function nextLowerGraphicsTier(tier: GraphicsTier): GraphicsTier {
  if (tier === "high") return "balanced";
  return "classroom";
}
