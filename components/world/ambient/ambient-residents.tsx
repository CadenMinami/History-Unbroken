"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import type {
  AmbientLines,
  SceneManifest,
  WorldZoneId,
} from "@/schemas/world-manifest";
import type { GraphicsProfile } from "@/lib/world/graphics-profile";

import { PeriodCharacter } from "../character/period-character";

export type AmbientResidentPlacement = Readonly<{
  residentId: string;
  zoneId: WorldZoneId;
  ambientLineId: string;
  caption: string;
  basePosition: readonly [number, number, number];
  pathRadius: number;
  phase: number;
  speed: number;
}>;

export type AmbientResidentTransform = Readonly<{
  position: readonly [number, number, number];
  rotationY: number;
}>;

const MAX_RESIDENTS_PER_ZONE = 4;

// Each slot keeps a full walking envelope away from the others. The world uses
// ambient residents for atmosphere only, so a sparse street reads better than
// a crowd of figures clipping through one another.
const RESIDENT_ROUTE_SLOTS = [
  { offset: [-2.7, -2.4] as const, pathRadius: 0.28, phase: 0.15, speed: 0.16 },
  { offset: [2.7, 2.4] as const, pathRadius: 0.3, phase: 1.22, speed: 0.176 },
  { offset: [-2.7, 2.4] as const, pathRadius: 0.26, phase: 2.39, speed: 0.152 },
  { offset: [2.7, -2.4] as const, pathRadius: 0.32, phase: 3.46, speed: 0.168 },
] as const;

export function resolveAmbientResidentTransform(
  placement: AmbientResidentPlacement,
  elapsed: number,
  reducedMotion: boolean,
): AmbientResidentTransform {
  if (reducedMotion) {
    return { position: placement.basePosition, rotationY: 0 };
  }

  const angle = elapsed * placement.speed + placement.phase;
  return {
    position: [
      placement.basePosition[0] + Math.cos(angle) * placement.pathRadius,
      placement.basePosition[1],
      placement.basePosition[2] + Math.sin(angle) * placement.pathRadius,
    ],
    rotationY: -angle + Math.PI / 2,
  };
}

export function buildAmbientResidentPlacements(
  manifest: SceneManifest,
  ambientLines: AmbientLines,
  requestedCount: number,
): AmbientResidentPlacement[] {
  if (!Number.isFinite(requestedCount) || requestedCount <= 0) return [];
  const linesById = new Map(
    ambientLines.lines.map((line) => [line.ambientLineId, line]),
  );
  const zoneEntries = manifest.zones.flatMap((zone, zoneIndex) => {
    if (!zone.dynamicContentAllowlist.includes("generic_ambient_resident")) {
      return [];
    }
    const ambientLineId = zone.ambientLineIds[0];
    const line = linesById.get(ambientLineId);
    const safeSpawn = zone.safeSpawns[0];
    return line && safeSpawn ? [{ line, safeSpawn, zone, zoneIndex }] : [];
  });
  if (zoneEntries.length === 0) return [];

  const count = Math.min(
    64,
    Math.floor(requestedCount),
    zoneEntries.length * MAX_RESIDENTS_PER_ZONE,
  );
  const residentsPerZone = Array.from({ length: zoneEntries.length }, () => 0);

  return Array.from({ length: count }, (_, index) => {
    const zoneEntryIndex = index % zoneEntries.length;
    const entry = zoneEntries[zoneEntryIndex];
    const slotIndex = residentsPerZone[zoneEntryIndex];
    residentsPerZone[zoneEntryIndex] += 1;
    const slot = RESIDENT_ROUTE_SLOTS[slotIndex];
    return {
      residentId: `AMBIENT-RESIDENT-${String(index + 1).padStart(2, "0")}`,
      zoneId: entry.zone.zoneId,
      ambientLineId: entry.line.ambientLineId,
      caption: entry.line.text,
      basePosition: [
        entry.safeSpawn.position[0] + slot.offset[0],
        entry.safeSpawn.position[1],
        entry.safeSpawn.position[2] + slot.offset[1],
      ],
      pathRadius: slot.pathRadius,
      phase: entry.zoneIndex * 1.31 + slot.phase,
      speed: slot.speed,
    };
  });
}

interface AmbientResidentsProps {
  ambientLines: AmbientLines;
  count: number;
  manifest: SceneManifest;
  profile: GraphicsProfile;
  reducedMotion?: boolean;
}

export function AmbientResidents({
  ambientLines,
  count,
  manifest,
  profile,
  reducedMotion = false,
}: AmbientResidentsProps) {
  const placements = buildAmbientResidentPlacements(
    manifest,
    ambientLines,
    count,
  );
  const residentRefs = useRef<Array<Group | null>>([]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    placements.forEach((placement, index) => {
      const resident = residentRefs.current[index];
      if (!resident) return;
      const transform = resolveAmbientResidentTransform(
        placement,
        elapsed,
        reducedMotion,
      );
      resident.position.set(...transform.position);
      resident.rotation.y = transform.rotationY;
    });
  });

  return (
    <>
      {placements.map((placement, index) => (
        <group
          key={placement.residentId}
          position={placement.basePosition}
          ref={(resident) => {
            residentRefs.current[index] = resident;
          }}
        >
          <PeriodCharacter
            motion="walk"
            palette={{
              skin: index % 3 === 0 ? "#8d6852" : "#ae8569",
              coat: index % 2 === 0 ? "#4d5f58" : "#62564c",
              waistcoat: index % 2 === 0 ? "#93805e" : "#6d776c",
              breeches: "#4e4841",
              stockings: "#aaa393",
              shoes: "#292622",
              hair: index % 2 === 0 ? "#40342c" : "#594539",
              hat: "#34312c",
            }}
            profile={profile}
            reducedMotion={reducedMotion}
            scale={0.78 + (index % 3) * 0.04}
          />
        </group>
      ))}
    </>
  );
}
