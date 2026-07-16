"use client";

import { Html } from "@react-three/drei";

import { WORLD_HTML_Z_INDEX_RANGE } from "@/lib/world/world-overlay";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import type { SceneManifest } from "@/schemas/world-manifest";

import type { ProximityCandidate } from "../interactions/proximity-registry";

const manifest = loadVarennesSceneManifest();
type ManifestInteractable = SceneManifest["interactables"][number];

const e1Interactable = manifest.interactables.find(
  (item) =>
    item.canonicalTarget.targetType === "evidence" &&
    item.canonicalTarget.evidenceId === "E1",
);
const civicStationInteractable = manifest.interactables.find(
  (item) =>
    item.canonicalTarget.targetType === "station" &&
    item.canonicalTarget.stationId === "STATION-VARENNES-CIVIC",
);
const louisInteractable = manifest.interactables.find(
  (item) =>
    item.canonicalTarget.targetType === "station" &&
    item.canonicalTarget.stationId === "CHAR-LOUIS",
);

if (!e1Interactable) throw new Error("The civic zone requires the reviewed declaration.");
if (!louisInteractable) throw new Error("The civic zone requires the Louis station.");
if (!civicStationInteractable) {
  throw new Error("The civic zone requires the static Varennes civic station.");
}

const civicManifestZone = manifest.zones.find(
  (zone) => zone.zoneId === e1Interactable.zoneId,
);
if (!civicManifestZone) throw new Error("The civic interactables require an authored zone.");

const civicSpawn = civicManifestZone.safeSpawns[0].position;
const civicPlacementLabel = civicManifestZone.placementLabel;
const e1Position: [number, number, number] = [
  civicSpawn[0] - 2,
  civicSpawn[1],
  civicSpawn[2] - 1.75,
];
const civicStationPosition: [number, number, number] = [
  civicSpawn[0] + 2.5,
  civicSpawn[1],
  civicSpawn[2] + 1.5,
];
const louisPosition: [number, number, number] = [
  civicSpawn[0] + 4.5,
  civicSpawn[1],
  civicSpawn[2] - 1.5,
];

function candidateFromManifest(
  interactable: ManifestInteractable,
  position: [number, number, number],
): ProximityCandidate {
  return {
    candidateId: interactable.interactableId,
    eligible: true,
    position,
    request: {
      interactableId: interactable.interactableId,
      zoneId: interactable.zoneId,
      interactionType: interactable.interactionType,
      canonicalTarget: interactable.canonicalTarget,
    },
  };
}

export const CIVIC_E1_CANDIDATE = candidateFromManifest(e1Interactable, e1Position);
export const CIVIC_LOUIS_CANDIDATE = candidateFromManifest(
  louisInteractable,
  louisPosition,
);
export const CIVIC_STATION_CANDIDATE = candidateFromManifest(
  civicStationInteractable,
  civicStationPosition,
);
export const CIVIC_CANDIDATES = [
  CIVIC_E1_CANDIDATE,
  CIVIC_LOUIS_CANDIDATE,
  CIVIC_STATION_CANDIDATE,
] as const satisfies readonly ProximityCandidate[];

export function CivicZone() {
  return (
    <group>
      <mesh
        receiveShadow
        position={[civicSpawn[0], 0.035, civicSpawn[2]]}
        scale={[10, 0.07, 6.5]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#767b7a" roughness={1} />
      </mesh>

      <group position={[civicSpawn[0], 0, civicSpawn[2] - 3.6]}>
        <mesh castShadow receiveShadow position={[0, 1.45, 0]} scale={[5.2, 2.9, 1.35]}>
          <boxGeometry />
          <meshStandardMaterial color="#9a9d98" roughness={0.97} />
        </mesh>
        {[-3.3, 0, 3.3].map((x) => (
          <mesh
            castShadow
            key={x}
            position={[x, 3.22, 0]}
            rotation={[0, 0, Math.PI / 4]}
            scale={[1.75, 1.75, 1.2]}
          >
            <boxGeometry />
            <meshStandardMaterial color="#51585b" roughness={0.95} />
          </mesh>
        ))}
      </group>

      <group position={e1Position}>
        <mesh castShadow position={[0, 0.72, 0]} scale={[0.92, 1.44, 0.72]}>
          <boxGeometry />
          <meshStandardMaterial color="#4b5357" roughness={0.94} />
        </mesh>
        <mesh position={[0, 1.47, -0.08]} rotation={[-0.3, 0, 0]} scale={[0.72, 0.04, 0.5]}>
          <boxGeometry />
          <meshStandardMaterial color="#d9d7cf" roughness={0.9} />
        </mesh>
      </group>

      <group position={louisPosition}>
        <mesh castShadow position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.24, 14, 14]} />
          <meshStandardMaterial color="#c9b69f" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0, 0.78, 0]} scale={[0.48, 0.9, 0.34]}>
          <capsuleGeometry args={[0.5, 1, 6, 14]} />
          <meshStandardMaterial color="#3e4a52" roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 1.73, 0]} scale={[0.29, 0.08, 0.29]}>
          <cylinderGeometry args={[1, 1.12, 1, 8]} />
          <meshStandardMaterial color="#786843" roughness={0.88} />
        </mesh>
      </group>

      <group position={civicStationPosition}>
        <mesh castShadow position={[0, 1.15, 0]} scale={[2.25, 1.45, 0.16]}>
          <boxGeometry />
          <meshStandardMaterial color="#464f53" roughness={0.95} />
        </mesh>
        {[-1.25, 0, 1.25].map((x) => (
          <group key={x} position={[x, 0, -0.4]}>
            <mesh castShadow position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color="#7f8582" roughness={0.96} />
            </mesh>
            <mesh castShadow position={[0, 0.66, 0]} scale={[0.35, 0.72, 0.25]}>
              <capsuleGeometry args={[0.5, 1, 6, 12]} />
              <meshStandardMaterial color="#626a6c" roughness={0.97} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[civicSpawn[0], 2.65, civicSpawn[2] + 3.35]}>
        <mesh scale={[3.6, 0.42, 0.06]}>
          <boxGeometry />
          <meshStandardMaterial color="#30363a" roughness={0.92} />
        </mesh>
        <Html
          center
          distanceFactor={9}
          position={[0, 0, 0.07]}
          transform
          zIndexRange={WORLD_HTML_Z_INDEX_RANGE}
        >
          <div
            aria-hidden="true"
            style={{
              color: "#f4f2ec",
              fontFamily: "monospace",
              fontSize: "6px",
              lineHeight: 1.2,
              textAlign: "center",
              width: "210px",
            }}
          >
            {civicPlacementLabel}
          </div>
        </Html>
      </group>
    </group>
  );
}
