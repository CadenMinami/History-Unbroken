import { describe, expect, it } from "vitest";

import * as archiveZone from "@/components/world/zones/archive-zone";
import * as bridgeZone from "@/components/world/zones/bridge-zone";
import * as civicZone from "@/components/world/zones/civic-zone";
import type { ProximityCandidate } from "@/components/world/interactions/proximity-registry";
import * as postRoadZone from "@/components/world/zones/post-road-zone";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";

const manifest = loadVarennesSceneManifest();

function readCandidateSet(
  moduleExports: object,
  exportName: string,
): readonly ProximityCandidate[] {
  const candidates = (moduleExports as Record<string, unknown>)[exportName];
  expect(Array.isArray(candidates), `${exportName} must be an exported candidate set`).toBe(true);
  return candidates as readonly ProximityCandidate[];
}

function targetKey(candidate: ProximityCandidate): string {
  const target = candidate.request.canonicalTarget;
  if (target.targetType === "evidence") return `evidence:${target.evidenceId}`;
  if (target.targetType === "station") return `station:${target.stationId}`;
  if (target.targetType === "repair_checkpoint") {
    return `repair_checkpoint:${target.repairCheckpointId}`;
  }
  return `case_surface:${target.surfaceId}`;
}

const candidateSets = [
  readCandidateSet(archiveZone, "ARCHIVE_CANDIDATES"),
  readCandidateSet(postRoadZone, "POST_ROAD_CANDIDATES"),
  readCandidateSet(civicZone, "CIVIC_CANDIDATES"),
  readCandidateSet(bridgeZone, "BRIDGE_CANDIDATES"),
];
const candidates = candidateSets.flat();

describe("zone proximity candidates", () => {
  it("exports only the required targets for each zone", () => {
    expect(candidateSets[0].map(targetKey)).toEqual([
      "evidence:E3",
      "evidence:E2",
      "station:STATION-ASSEMBLY",
      "case_surface:journal",
    ]);
    expect(candidateSets[1].map(targetKey)).toEqual([
      "station:CHAR-DROUET",
      "evidence:E4",
    ]);
    expect(candidateSets[2].map(targetKey)).toEqual([
      "evidence:E1",
      "station:CHAR-LOUIS",
      "station:STATION-VARENNES-CIVIC",
    ]);
    expect(candidateSets[3].map(targetKey)).toEqual(["evidence:E5"]);
  });

  it("constructs every navigation request from its manifest interactable", () => {
    for (const candidate of candidates) {
      const interactable = manifest.interactables.find(
        (item) => item.interactableId === candidate.candidateId,
      );
      expect(interactable).toBeDefined();
      expect(candidate.request).toEqual({
        interactableId: interactable?.interactableId,
        zoneId: interactable?.zoneId,
        interactionType: interactable?.interactionType,
        canonicalTarget: interactable?.canonicalTarget,
      });
    }
  });

  it("uses globally unique IDs within eight horizontal units of the authored safe spawn", () => {
    expect(new Set(candidates.map((candidate) => candidate.candidateId)).size).toBe(
      candidates.length,
    );

    for (const candidate of candidates) {
      const zone = manifest.zones.find((item) => item.zoneId === candidate.request.zoneId);
      expect(zone).toBeDefined();
      const [spawnX, , spawnZ] = zone!.safeSpawns[0].position;
      const horizontalDistance = Math.hypot(
        candidate.position[0] - spawnX,
        candidate.position[2] - spawnZ,
      );
      expect(horizontalDistance).toBeLessThanOrEqual(8);
    }
  });
});
