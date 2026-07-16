"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { WORLD_HTML_Z_INDEX_RANGE } from "@/lib/world/world-overlay";
import type {
  AmbientLines,
  SceneManifest,
  WorldZoneId,
} from "@/schemas/world-manifest";

import styles from "./ambient-residents.module.css";

export const AMBIENT_AUTHORITY_DISCLOSURE =
  "Authored dramatization; not testimony or evidence." as const;

export type AmbientResidentPlacement = Readonly<{
  residentId: string;
  zoneId: WorldZoneId;
  ambientLineId: string;
  caption: string;
  basePosition: readonly [number, number, number];
  pathRadius: number;
  phase: number;
  speed: number;
  showCaption: boolean;
}>;

export function buildAmbientResidentPlacements(
  manifest: SceneManifest,
  ambientLines: AmbientLines,
  requestedCount: number,
): AmbientResidentPlacement[] {
  if (!Number.isFinite(requestedCount) || requestedCount <= 0) return [];
  const count = Math.min(64, Math.floor(requestedCount));
  const linesById = new Map(
    ambientLines.lines.map((line) => [line.ambientLineId, line]),
  );
  const zoneEntries = manifest.zones.flatMap((zone, zoneIndex) => {
    const ambientLineId = zone.ambientLineIds[0];
    const line = linesById.get(ambientLineId);
    const safeSpawn = zone.safeSpawns[0];
    return line && safeSpawn ? [{ line, safeSpawn, zone, zoneIndex }] : [];
  });
  if (zoneEntries.length === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const entry = zoneEntries[index % zoneEntries.length];
    const cycle = Math.floor(index / zoneEntries.length);
    const side = (entry.zoneIndex + cycle) % 2 === 0 ? -1 : 1;
    return {
      residentId: `AMBIENT-RESIDENT-${String(index + 1).padStart(2, "0")}`,
      zoneId: entry.zone.zoneId,
      ambientLineId: entry.line.ambientLineId,
      caption: entry.line.text,
      basePosition: [
        entry.safeSpawn.position[0] + side * (2 + (cycle % 2) * 0.65),
        entry.safeSpawn.position[1],
        entry.safeSpawn.position[2] + (entry.zoneIndex % 2 === 0 ? 1.5 : -1.5),
      ],
      pathRadius: 0.75 + (cycle % 3) * 0.18,
      phase: entry.zoneIndex * 1.31 + cycle * 0.83,
      speed: 0.16 + (index % 4) * 0.018,
      showCaption: cycle === 0,
    };
  });
}

interface AmbientResidentsProps {
  ambientLines: AmbientLines;
  count: number;
  manifest: SceneManifest;
}

export function AmbientResidents({
  ambientLines,
  count,
  manifest,
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
      const angle = elapsed * placement.speed + placement.phase;
      resident.position.set(
        placement.basePosition[0] + Math.cos(angle) * placement.pathRadius,
        placement.basePosition[1],
        placement.basePosition[2] + Math.sin(angle) * placement.pathRadius,
      );
      resident.rotation.y = -angle + Math.PI / 2;
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
          <mesh castShadow position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#a78f78" roughness={0.96} />
          </mesh>
          <mesh castShadow position={[0, 0.8, 0]} scale={[0.38, 0.78, 0.28]}>
            <capsuleGeometry args={[0.48, 1, 5, 10]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#5f6962" : "#68645c"}
              roughness={0.98}
            />
          </mesh>
          {placement.showCaption ? (
            <Html
              center
              distanceFactor={10}
              position={[0, 2.35, 0]}
              zIndexRange={WORLD_HTML_Z_INDEX_RANGE}
            >
              <aside
                aria-label="Ambient reconstruction caption"
                className={styles.caption}
                style={{
                  width: "210px",
                  padding: "8px 10px",
                  color: "#f5f1e8",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "11px",
                  lineHeight: 1.35,
                  textAlign: "left",
                  border: "1px solid rgba(255,255,255,.28)",
                  background: "rgba(25,31,28,.9)",
                  pointerEvents: "none",
                }}
              >
                <span>{placement.caption}</span>
                <small
                  style={{
                    marginTop: "5px",
                    display: "block",
                    color: "#d5bd82",
                    fontSize: "8px",
                    textTransform: "uppercase",
                  }}
                >
                  {AMBIENT_AUTHORITY_DISCLOSURE}
                </small>
              </aside>
            </Html>
          ) : null}
        </group>
      ))}
    </>
  );
}
