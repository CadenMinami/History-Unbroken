import { describe, expect, it } from "vitest";

import { findVisitedZoneSpawn } from "@/lib/world/zone-discovery";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";

const manifest = loadVarennesSceneManifest();

describe("world zone discovery", () => {
  it("returns the manifest-authored safe spawn when the player enters its visit radius", () => {
    expect(findVisitedZoneSpawn(manifest, [24.5, 0, 1], 8)).toEqual({
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
  });

  it("does not infer a visit from the unclaimed space between compact zones", () => {
    expect(findVisitedZoneSpawn(manifest, [12, 0, 0], 8)).toBeNull();
  });

  it("uses manifest order as a stable tie-breaker", () => {
    const activeZoneIds = new Set([
      "post-road-square" as const,
      "archive-antechamber" as const,
    ]);

    expect(findVisitedZoneSpawn(manifest, [12, 0, 0], 12, activeZoneIds)).toEqual({
      zoneId: "archive-antechamber",
      spawnId: "SPAWN-ARCHIVE-ENTRY",
    });
  });

  it("fails closed for materially off-world positions", () => {
    expect(findVisitedZoneSpawn(manifest, [24, 9, 0], 8)).toBeNull();
    expect(findVisitedZoneSpawn(manifest, [24, -9, 0], 8)).toBeNull();
    expect(findVisitedZoneSpawn(manifest, [1_000_000, 0, 1_000_000], 8)).toBeNull();
  });

  it("considers only caller-declared active authored zones", () => {
    const archiveOnly = new Set(["archive-antechamber" as const]);

    expect(findVisitedZoneSpawn(manifest, [24.5, 0, 1], 8, archiveOnly)).toBeNull();
    expect(findVisitedZoneSpawn(manifest, [0, 0, 0], 8, archiveOnly)).toEqual({
      zoneId: "archive-antechamber",
      spawnId: "SPAWN-ARCHIVE-ENTRY",
    });
    expect(
      findVisitedZoneSpawn(
        manifest,
        [24.5, 0, 1],
        8,
        new Set(["not-an-authored-zone" as never]),
      ),
    ).toBeNull();
  });

  it("rejects invalid position and radius measurements", () => {
    expect(findVisitedZoneSpawn(manifest, [Number.NaN, 0, 0], 8)).toBeNull();
    expect(findVisitedZoneSpawn(manifest, [24, 0, 0], -1)).toBeNull();
    expect(findVisitedZoneSpawn(manifest, [24, 0, 0], Number.POSITIVE_INFINITY)).toBeNull();
  });
});
