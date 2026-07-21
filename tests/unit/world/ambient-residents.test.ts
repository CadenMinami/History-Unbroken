import { describe, expect, it } from "vitest";

import {
  buildAmbientResidentPlacements,
  resolveAmbientResidentTransform,
} from "@/components/world/ambient/ambient-residents";
import {
  loadVarennesAmbientLines,
  loadVarennesSceneManifest,
} from "@/lib/world/scene-manifest";

const manifest = loadVarennesSceneManifest();
const ambientLines = loadVarennesAmbientLines();

describe("ambient resident placements", () => {
  it("builds a deterministic, capped distribution from authored zones and captions", () => {
    const first = buildAmbientResidentPlacements(manifest, ambientLines, 16);
    const second = buildAmbientResidentPlacements(manifest, ambientLines, 16);

    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
    expect(buildAmbientResidentPlacements(manifest, ambientLines, 3)).toHaveLength(
      3,
    );
    expect(buildAmbientResidentPlacements(manifest, ambientLines, 0)).toEqual([]);
    expect(buildAmbientResidentPlacements(manifest, ambientLines, -1)).toEqual([]);
  });

  it("keeps every resident near an authored safe spawn and every caption non-authoritative", () => {
    const placements = buildAmbientResidentPlacements(manifest, ambientLines, 16);
    const knownLines = new Map(
      ambientLines.lines.map((line) => [line.ambientLineId, line]),
    );

    for (const placement of placements) {
      const zone = manifest.zones.find(
        (candidate) => candidate.zoneId === placement.zoneId,
      );
      const line = knownLines.get(placement.ambientLineId);
      expect(zone).toBeDefined();
      expect(line).toBeDefined();
      expect(placement.caption).toBe(line?.text);
      expect(line).toMatchObject({
        epistemicClassification: "dramatization",
        countsAsHistoricalEvidence: false,
        affectsProgression: false,
        evidenceIds: [],
        factIds: [],
        sourceIds: [],
      });
      const safeSpawn = zone!.safeSpawns[0].position;
      expect(
        Math.hypot(
          placement.basePosition[0] - safeSpawn[0],
          placement.basePosition[2] - safeSpawn[2],
        ) + placement.pathRadius,
      ).toBeLessThanOrEqual(6);
    }
  });

  it("keeps each resident's walking envelope clear of every other resident", () => {
    const placements = buildAmbientResidentPlacements(manifest, ambientLines, 16);

    for (let index = 0; index < placements.length; index += 1) {
      for (let comparisonIndex = index + 1; comparisonIndex < placements.length; comparisonIndex += 1) {
        const first = placements[index];
        const second = placements[comparisonIndex];
        const baseDistance = Math.hypot(
          first.basePosition[0] - second.basePosition[0],
          first.basePosition[2] - second.basePosition[2],
        );
        const closestApproach =
          baseDistance - first.pathRadius - second.pathRadius;

        expect(
          closestApproach,
          `${first.residentId} can overlap ${second.residentId}`,
        ).toBeGreaterThanOrEqual(1.1);
      }
    }
  });

  it("freezes path motion when reduced motion is active", () => {
    const placement = buildAmbientResidentPlacements(
      manifest,
      ambientLines,
      1,
    )[0];
    const moving = resolveAmbientResidentTransform(placement, 12, false);
    const reduced = resolveAmbientResidentTransform(placement, 12, true);

    expect(moving.position).not.toEqual(placement.basePosition);
    expect(reduced).toEqual({
      position: placement.basePosition,
      rotationY: 0,
    });
  });

  it("mounts residents only in zones that explicitly allow generic ambient figures", () => {
    const restrictedManifest = structuredClone(manifest);
    const finalZone = restrictedManifest.zones.find(
      (zone) => zone.zoneId === "bridge-approach",
    ) as (typeof restrictedManifest.zones)[number] & {
      dynamicContentAllowlist?: string[];
    };
    if (!finalZone) throw new Error("Missing final-zone fixture.");
    finalZone.dynamicContentAllowlist = [];

    const placements = buildAmbientResidentPlacements(
      restrictedManifest,
      ambientLines,
      16,
    );

    expect(placements.some((placement) => placement.zoneId === "bridge-approach")).toBe(
      false,
    );
  });
});
