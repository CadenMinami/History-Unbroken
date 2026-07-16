"use client";

import { Html } from "@react-three/drei";

import { WORLD_HTML_Z_INDEX_RANGE } from "@/lib/world/world-overlay";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import type { SceneManifest } from "@/schemas/world-manifest";

import type { ProximityCandidate } from "../interactions/proximity-registry";

const manifest = loadVarennesSceneManifest();
type ManifestInteractable = SceneManifest["interactables"][number];

const drouetInteractable = manifest.interactables.find(
  (item) =>
    item.canonicalTarget.targetType === "station" &&
    item.canonicalTarget.stationId === "CHAR-DROUET",
);
const e4Interactable = manifest.interactables.find(
  (item) =>
    item.canonicalTarget.targetType === "evidence" &&
    item.canonicalTarget.evidenceId === "E4",
);

if (!drouetInteractable) throw new Error("The post-road zone requires Drouet's station.");
if (!e4Interactable) throw new Error("The post-road zone requires the route board.");

const postRoadManifestZone = manifest.zones.find(
  (zone) => zone.zoneId === drouetInteractable.zoneId,
);
if (!postRoadManifestZone) {
  throw new Error("The post-road interactables require an authored zone.");
}

const postRoadSpawn = postRoadManifestZone.safeSpawns[0].position;
const postRoadPlacementLabel = postRoadManifestZone.placementLabel;
const drouetPosition: [number, number, number] = [
  postRoadSpawn[0] - 1.5,
  postRoadSpawn[1],
  postRoadSpawn[2] + 2,
];
const e4Position: [number, number, number] = [
  postRoadSpawn[0] + 2.5,
  postRoadSpawn[1],
  postRoadSpawn[2] - 1.75,
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

export const DROUET_CANDIDATE = candidateFromManifest(
  drouetInteractable,
  drouetPosition,
);
export const POST_ROAD_E4_CANDIDATE = candidateFromManifest(
  e4Interactable,
  e4Position,
);
export const POST_ROAD_CANDIDATES = [
  DROUET_CANDIDATE,
  POST_ROAD_E4_CANDIDATE,
] as const satisfies readonly ProximityCandidate[];

export function PostRoadZone() {
  return (
    <group>
      <mesh
        receiveShadow
        position={[postRoadSpawn[0], 0.035, postRoadSpawn[2]]}
        scale={[9.5, 0.07, 6]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#77746e" roughness={1} />
      </mesh>
      <mesh
        receiveShadow
        position={[postRoadSpawn[0], 0.08, postRoadSpawn[2]]}
        scale={[9.5, 0.06, 2.25]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#a4a09a" roughness={1} />
      </mesh>

      <group position={drouetPosition}>
        <mesh castShadow position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.23, 18, 18]} />
          <meshStandardMaterial color="#b79879" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.88, 0]} scale={[0.5, 0.9, 0.34]}>
          <capsuleGeometry args={[0.5, 1, 8, 16]} />
          <meshStandardMaterial color="#654238" roughness={0.94} />
        </mesh>
        <mesh castShadow position={[0, 1.86, 0]} scale={[0.39, 0.08, 0.39]}>
          <cylinderGeometry args={[1, 1.15, 1, 20]} />
          <meshStandardMaterial color="#3c3028" roughness={0.96} />
        </mesh>
      </group>

      <group position={e4Position}>
        <mesh castShadow position={[0, 1.2, 0]} scale={[1.7, 1.15, 0.12]}>
          <boxGeometry />
          <meshStandardMaterial color="#4d5559" roughness={0.94} />
        </mesh>
        <mesh castShadow position={[0, 0.55, 0.2]} scale={[0.12, 1.1, 0.12]}>
          <boxGeometry />
          <meshStandardMaterial color="#31383b" roughness={0.96} />
        </mesh>
        <mesh position={[0, 1.2, 0.13]} scale={[1.48, 0.92, 0.025]}>
          <boxGeometry />
          <meshStandardMaterial color="#d8d5ca" roughness={0.9} />
        </mesh>
      </group>

      <group position={[postRoadSpawn[0], 2.5, postRoadSpawn[2] - 3.8]}>
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
            {postRoadPlacementLabel}
          </div>
        </Html>
      </group>
    </group>
  );
}
