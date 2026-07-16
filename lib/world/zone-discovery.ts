import type { SafeSpawnReference } from "@/lib/world/spatial-session";
import type { SceneManifest } from "@/schemas/world-manifest";

export type WorldPosition = readonly [number, number, number];

export function findVisitedZoneSpawn(
  manifest: SceneManifest,
  position: WorldPosition,
  visitRadius: number,
  activeZoneIds?: ReadonlySet<SafeSpawnReference["zoneId"]>,
): SafeSpawnReference | null {
  if (
    !position.every(Number.isFinite) ||
    !Number.isFinite(visitRadius) ||
    visitRadius < 0
  ) {
    return null;
  }

  const maximumDistanceSquared = visitRadius * visitRadius;
  let nearest: { distanceSquared: number; reference: SafeSpawnReference } | null =
    null;

  for (const zone of manifest.zones) {
    if (activeZoneIds && !activeZoneIds.has(zone.zoneId)) continue;

    for (const spawn of zone.safeSpawns) {
      const deltaX = position[0] - spawn.position[0];
      const deltaY = position[1] - spawn.position[1];
      const deltaZ = position[2] - spawn.position[2];
      const distanceSquared =
        deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
      if (
        distanceSquared <= maximumDistanceSquared &&
        (nearest === null || distanceSquared < nearest.distanceSquared)
      ) {
        nearest = {
          distanceSquared,
          reference: { zoneId: zone.zoneId, spawnId: spawn.spawnId },
        };
      }
    }
  }

  return nearest?.reference ?? null;
}
