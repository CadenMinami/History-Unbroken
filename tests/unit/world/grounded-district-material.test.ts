import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DISTRICT_GROUND_PRESENTATION } from "@/components/world/environment/grounded-district";

describe("grounded district material profile", () => {
  it("passes the selected graphics texture tier to every modular facade", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/world/environment/grounded-district.tsx",
      ),
      "utf8",
    );

    expect(source).toMatch(/textureTier=\{profile\.textureTier\}/);
    expect(source).toMatch(/profile\.textureTier === "low"/);
    expect(source).toMatch(
      /<OptionalAssetBoundary[\s\S]*?assetId="district-facades-pbr"[\s\S]*?fallback=\{facadeFallback\}/,
    );
    expect(source).toMatch(/<Suspense fallback=\{facadeFallback\}>/);
  });

  it("uses a broad muted-earth road apron instead of a flat saturated verge", () => {
    expect(DISTRICT_GROUND_PRESENTATION).toEqual({
      color: "#3d3830",
      roadRepeatZ: 3,
      roadWidth: 10.4,
    });
    expect(Object.isFrozen(DISTRICT_GROUND_PRESENTATION)).toBe(true);
  });

  it("does not cover the continuous road with flat zone-colored slabs", () => {
    for (const fileName of [
      "archive-zone.tsx",
      "post-road-zone.tsx",
      "civic-zone.tsx",
    ]) {
      const source = readFileSync(
        join(process.cwd(), "components/world/zones", fileName),
        "utf8",
      );
      expect(source).not.toMatch(
        /receiveShadow[\s\S]{0,80}position=\{\[[^\n]*,\s*0\.0(?:35|8),/,
      );
    }
  });

  it("keeps civic-zone content from duplicating district architecture", () => {
    const civicZoneSource = readFileSync(
      join(process.cwd(), "components/world/zones/civic-zone.tsx"),
      "utf8",
    );
    const runtimeSource = readFileSync(
      join(process.cwd(), "components/world/scene-runtime.tsx"),
      "utf8",
    );

    expect(civicZoneSource).not.toMatch(/civic-background-facade/);
    expect(civicZoneSource).not.toMatch(/const CIVIC_FACADE = Object\.freeze/);
    expect(civicZoneSource).not.toMatch(/scale=\{\[5\.2, 2\.9, 1\.35\]\}/);
    expect(runtimeSource).not.toMatch(/getObjectByName\("civic-background-facade"\)/);
  });
});
