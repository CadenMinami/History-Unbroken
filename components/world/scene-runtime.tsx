"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  type RapierCollider,
  RigidBody,
} from "@react-three/rapier";
import type { EcctrlHandle } from "ecctrl";
import { Suspense, useEffect } from "react";
import { useRef } from "react";
import {
  Box3,
  Mesh,
  type Object3D,
  Raycaster,
  Vector3,
} from "three";

import type { GraphicsProfile } from "@/lib/world/graphics-profile";
import { CAMERA_CONFIG } from "@/lib/world/camera-config";
import {
  applyFacadeOcclusion,
  collectCameraOccludingFacades,
} from "@/lib/world/camera-facade-occlusion";
import {
  DEFAULT_CAMERA_PREFERENCES,
  type CameraPreferences,
} from "@/lib/world/camera-preferences";
import { subscribeToWebGLContextLoss } from "@/lib/world/webgl-context-loss";
import {
  loadVarennesAmbientLines,
  loadVarennesSceneManifest,
} from "@/lib/world/scene-manifest";
import type { WorldInteractionRequest } from "@/schemas/world-manifest";

import type { CameraInputChannel } from "./camera/camera-input-boundary";
import {
  composeThirdPersonCamera,
  createThirdPersonCameraState,
  ThirdPersonCameraRig,
} from "./camera/third-person-camera-rig";

import { InvestigatorController } from "./character/investigator-controller";
import { AmbientResidents } from "./ambient/ambient-residents";
import {
  DISTRICT_BUILDINGS,
  GroundedDistrict,
} from "./environment/grounded-district";
import {
  DISTRICT_FACADE_PRESENTATION_SCALE,
  getDistrictTravelBoundaryWalls,
} from "./environment/district-layout";
import { getFacadeVisualBounds } from "./environment/modular-facade";
import { WorldLighting } from "./environment/world-lighting";
import { WorldPostProcessing } from "./environment/world-post-processing";
import {
  ZoneReadinessRegistry,
  ZoneReadinessSignal,
  type ZoneReadinessSnapshot,
} from "./environment/zone-readiness-registry";
import { ProximityRegistry } from "./interactions/proximity-registry";
import { ARCHIVE_CANDIDATES, ArchiveZone } from "./zones/archive-zone";
import { BRIDGE_CANDIDATES, BridgeZone } from "./zones/bridge-zone";
import { CIVIC_CANDIDATES, CivicZone } from "./zones/civic-zone";
import { POST_ROAD_CANDIDATES, PostRoadZone } from "./zones/post-road-zone";

const sceneManifest = loadVarennesSceneManifest();
const ambientLines = loadVarennesAmbientLines();
const worldCandidates = [
  ...ARCHIVE_CANDIDATES,
  ...POST_ROAD_CANDIDATES,
  ...CIVIC_CANDIDATES,
  ...BRIDGE_CANDIDATES,
] as const;
const districtTravelBoundaryWalls = getDistrictTravelBoundaryWalls();

const PRINCIPAL_SUBJECT_NAMES = [
  "principal-character-investigator",
  "principal-character-drouet",
  "principal-character-louis",
] as const;
const MAX_CAMERA_VISIBILITY_TARGET_DISTANCE = 24;
const CAMERA_VISIBILITY_TARGET_SCREEN_MARGIN = 0.18;

function isDescendantOfInvestigator(candidate: Object3D): boolean {
  let current: Object3D | null = candidate;
  while (current) {
    if (current.name === "principal-character-investigator") return true;
    current = current.parent;
  }
  return false;
}

function SceneSubjectTelemetry() {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const boundsRef = useRef(new Box3());
  const pointRef = useRef(new Vector3());
  const centerRef = useRef(new Vector3());
  const rayDirectionRef = useRef(new Vector3());
  const raycasterRef = useRef(new Raycaster());

  useFrame((frameState) => {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const subjects = PRINCIPAL_SUBJECT_NAMES.map((name) => {
      const subject = scene.getObjectByName(name);
      if (!subject) return { name, present: false };

      let meshCount = 0;
      let visibleMeshCount = 0;
      subject.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        meshCount += 1;
        const material = child.material;
        const materialVisible = Array.isArray(material)
          ? material.some((candidate) => candidate.visible)
          : material.visible;
        let ancestorVisible = true;
        let current: Object3D | null = child;
        while (current) {
          ancestorVisible &&= current.visible;
          current = current.parent;
        }
        if (ancestorVisible && materialVisible) visibleMeshCount += 1;
      });

      const bounds = boundsRef.current.setFromObject(subject);
      if (bounds.isEmpty()) {
        return {
          name,
          present: true,
          meshCount,
          projected: false,
          visibleMeshCount,
        };
      }

      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let nearestDepth = Number.POSITIVE_INFINITY;
      let furthestDepth = Number.NEGATIVE_INFINITY;
      const center = bounds.getCenter(centerRef.current);
      const cameraSpaceCenter = camera.worldToLocal(center.clone());
      const screenCenter = center.clone().project(camera);

      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = pointRef.current.set(x, y, z).project(camera);
            minX = Math.min(minX, projected.x);
            maxX = Math.max(maxX, projected.x);
            minY = Math.min(minY, projected.y);
            maxY = Math.max(maxY, projected.y);
            nearestDepth = Math.min(nearestDepth, projected.z);
            furthestDepth = Math.max(furthestDepth, projected.z);
          }
        }
      }

      const intersectsViewport =
        maxX >= -1 &&
        minX <= 1 &&
        maxY >= -1 &&
        minY <= 1 &&
        furthestDepth >= -1 &&
        nearestDepth <= 1;
      const rayDirection = rayDirectionRef.current
        .subVectors(center, camera.position)
        .normalize();
      const raycaster = raycasterRef.current;
      raycaster.set(camera.position, rayDirection);
      const firstVisibleHit = raycaster
        .intersectObjects(scene.children, true)
        .find((intersection) => {
          let current: Object3D | null = intersection.object;
          while (current) {
            if (current === subject) return true;
            current = current.parent;
          }
          return intersection.object.visible;
        });
      let firstHitBelongsToSubject = false;
      let firstHitName: string | null = null;
      const firstHitPath: string[] = [];
      if (firstVisibleHit) {
        firstHitName = firstVisibleHit.object.name || firstVisibleHit.object.type;
        let current: Object3D | null = firstVisibleHit.object;
        while (current) {
          firstHitPath.push(current.name || current.type);
          if (current === subject) {
            firstHitBelongsToSubject = true;
            break;
          }
          current = current.parent;
        }
      }

      return {
        name,
        meshCount,
        present: true,
        projected: true,
        intersectsViewport,
        cameraSpaceCenterZ: cameraSpaceCenter.z,
        firstHitBelongsToSubject,
        firstHitName,
        firstHitPath,
        screenCenterNdc: [screenCenter.x, screenCenter.y, screenCenter.z],
        screenHeightRatio: Math.max(0, maxY - minY) / 2,
        screenWidthRatio: Math.max(0, maxX - minX) / 2,
        visibleMeshCount,
        worldBoundsY: [bounds.min.y, bounds.max.y],
      };
    });

    frameState.gl.domElement.dataset.worldSubjects = JSON.stringify(subjects);
  });

  return null;
}

function PerformanceSampler({
  onSample,
}: {
  onSample: (timestampMs: number, fps: number) => void;
}) {
  useFrame((_state, deltaSeconds) => {
    if (deltaSeconds > 0) {
      onSample(performance.now(), 1 / deltaSeconds);
    }
  });

  return null;
}

function ContextLossMonitor({ onContextLost }: { onContextLost: () => void }) {
  const renderer = useThree((state) => state.gl);

  useEffect(
    () => subscribeToWebGLContextLoss(renderer.domElement, onContextLost),
    [onContextLost, renderer],
  );

  return null;
}

function CameraFacadeOcclusion({
  controllerRef,
  telemetryEnabled = false,
}: {
  controllerRef: React.RefObject<EcctrlHandle | null>;
  telemetryEnabled?: boolean;
}) {
  const scene = useThree((state) => state.scene);
  const playerTargetRef = useRef(new Vector3());
  const playerHeadTargetRef = useRef(new Vector3());
  const visibilityTargetRefs = useRef<Vector3[]>([]);
  const targetProjectionRef = useRef(new Vector3());
  const targetDirectionRef = useRef(new Vector3());
  const facadeGroupsRef = useRef<Object3D[]>([]);

  useEffect(
    () => () => {
      applyFacadeOcclusion(facadeGroupsRef.current, []);
    },
    [],
  );

  useFrame((frameState) => {
    const controller = controllerRef.current;
    if (!controller) return;

    const playerPosition = controller.currPos ?? controller.body.translation();
    if (
      !Number.isFinite(playerPosition.x) ||
      !Number.isFinite(playerPosition.y) ||
      !Number.isFinite(playerPosition.z)
    ) {
      return;
    }

    const facades: Object3D[] = [];
    scene.traverse((candidate) => {
      if (candidate.userData.cameraOcclusion === true) {
        facades.push(candidate);
      }
    });
    const previousFacades = facadeGroupsRef.current;
    const facadesChanged =
      facades.length !== previousFacades.length ||
      facades.some((facade, index) => facade !== previousFacades[index]);
    if (facadesChanged) {
      applyFacadeOcclusion(previousFacades, []);
      facadeGroupsRef.current = facades;
    }
    if (facades.length === 0) {
      if (telemetryEnabled) {
        frameState.gl.domElement.dataset.facadeOcclusion = JSON.stringify({
          facadeIds: [],
          occludingFacadeIds: [],
        });
      }
      return;
    }

    playerTargetRef.current.set(
      playerPosition.x,
      playerPosition.y + CAMERA_CONFIG.target.height,
      playerPosition.z,
    );
    playerHeadTargetRef.current.set(
      playerPosition.x,
      playerPosition.y + 1.55,
      playerPosition.z,
    );
    const supplementalTargets: Vector3[] = [];
    const supplementalTargetNames: string[] = [];
    scene.traverse((candidate) => {
      if (
        candidate.userData.cameraVisibilityTarget !== true ||
        isDescendantOfInvestigator(candidate)
      ) {
        return;
      }

      const target =
        visibilityTargetRefs.current[supplementalTargets.length] ??
        new Vector3();
      visibilityTargetRefs.current[supplementalTargets.length] = target;
      candidate.getWorldPosition(target);
      const height = candidate.userData.cameraVisibilityTargetHeight;
      if (typeof height === "number" && Number.isFinite(height)) {
        target.y += height;
      }

      const targetDistance = targetDirectionRef.current
        .subVectors(target, frameState.camera.position)
        .length();
      if (
        !Number.isFinite(targetDistance) ||
        targetDistance > MAX_CAMERA_VISIBILITY_TARGET_DISTANCE
      ) {
        return;
      }

      const projectedTarget = targetProjectionRef.current
        .copy(target)
        .project(frameState.camera);
      if (
        projectedTarget.z < -1 ||
        projectedTarget.z > 1 ||
        Math.abs(projectedTarget.x) > 1 + CAMERA_VISIBILITY_TARGET_SCREEN_MARGIN ||
        Math.abs(projectedTarget.y) > 1 + CAMERA_VISIBILITY_TARGET_SCREEN_MARGIN
      ) {
        return;
      }

      supplementalTargets.push(target);
      supplementalTargetNames.push(candidate.name || candidate.uuid);
    });
    const occludingFacades = collectCameraOccludingFacades({
      cameraPosition: frameState.camera.position,
      facades,
      target: playerTargetRef.current,
      targets: [playerHeadTargetRef.current, ...supplementalTargets],
    });
    applyFacadeOcclusion(facades, occludingFacades);
    if (telemetryEnabled) {
      frameState.gl.domElement.dataset.facadeOcclusion = JSON.stringify({
        cameraPosition: frameState.camera.position.toArray(),
        facadeIds: facades.map((facade) => facade.name),
        occludingFacadeIds: occludingFacades.map((facade) => facade.name),
        target: playerTargetRef.current.toArray(),
        supplementalTargetNames,
        supplementalTargets: supplementalTargets.map((target) => target.toArray()),
      });
    }
  });

  return null;
}

interface SceneRuntimeProps {
  cameraInputChannel: CameraInputChannel;
  cameraPreferences?: CameraPreferences;
  graphicsProfile: GraphicsProfile;
  initialPosition: [number, number, number];
  locomotionEnabled: boolean;
  movementResetGeneration?: number;
  runtimeKey: number;
  onControllerReady: () => void;
  onNearbyInteractionChange: (request: WorldInteractionRequest | null) => void;
  onPlayerPositionChange?: (position: [number, number, number]) => void;
  onContextLost: () => void;
  onCanvasElement: (canvas: HTMLCanvasElement) => void;
  onPerformanceSample: (timestampMs: number, fps: number) => void;
  onZoneReadinessChange: (snapshot: ZoneReadinessSnapshot) => void;
  telemetryEnabled?: boolean;
  testMode?: boolean;
  reducedMotion?: boolean;
}

export function SceneRuntime({
  cameraInputChannel,
  cameraPreferences = DEFAULT_CAMERA_PREFERENCES,
  graphicsProfile,
  initialPosition,
  locomotionEnabled,
  movementResetGeneration = 0,
  runtimeKey,
  onControllerReady,
  onNearbyInteractionChange,
  onPlayerPositionChange,
  onContextLost,
  onCanvasElement,
  onPerformanceSample,
  onZoneReadinessChange,
  telemetryEnabled = false,
  testMode = false,
  reducedMotion = false,
}: SceneRuntimeProps) {
  const controllerRef = useRef<EcctrlHandle>(null);
  const archiveEvidenceTableColliderRef = useRef<RapierCollider>(null);
  const initialCamera = composeThirdPersonCamera(
    {
      x: initialPosition[0],
      y: initialPosition[1],
      z: initialPosition[2],
    },
    createThirdPersonCameraState(),
  );

  return (
    <Canvas
      camera={{
        fov: CAMERA_CONFIG.fov.default,
        position: [
          initialCamera.position.x,
          initialCamera.position.y,
          initialCamera.position.z,
        ],
      }}
      dpr={graphicsProfile.dpr}
      frameloop={testMode ? "demand" : "always"}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: testMode,
      }}
      onCreated={({ gl }) => onCanvasElement(gl.domElement)}
      shadows={
        graphicsProfile.shadows.enabled
          ? graphicsProfile.tier === "high"
            ? "soft"
            : "basic"
          : false
      }
    >
      <ZoneReadinessRegistry
        onChange={onZoneReadinessChange}
        runtimeKey={runtimeKey}
      >
        <ContextLossMonitor onContextLost={onContextLost} />
        <ProximityRegistry
          candidates={worldCandidates}
          controllerRef={controllerRef}
          initialPosition={initialPosition}
          onChange={onNearbyInteractionChange}
          radius={3.1}
        />
        <WorldLighting profile={graphicsProfile} />
        <Suspense fallback={null}>
          <GroundedDistrict
            profile={graphicsProfile}
            reducedMotion={reducedMotion}
          />
          <AmbientResidents
            ambientLines={ambientLines}
            count={reducedMotion ? 0 : graphicsProfile.ambientCount}
            manifest={sceneManifest}
            profile={graphicsProfile}
            reducedMotion={reducedMotion}
          />
          <Physics colliders={false} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
            <RigidBody colliders={false} type="fixed">
              <CuboidCollider args={[120, 0.1, 80]} position={[36, -0.1, 0]} />
              {districtTravelBoundaryWalls.map((wall) => (
                <CuboidCollider
                  args={[...wall.args]}
                  key={wall.id}
                  position={wall.position}
                />
              ))}
              {DISTRICT_BUILDINGS.map((building) => {
                const bounds = getFacadeVisualBounds({
                  depth: building.size[2],
                  wallHeight: building.size[1],
                  width: building.size[0],
                });
                const scaledHalfHeight =
                  bounds.halfHeight * DISTRICT_FACADE_PRESENTATION_SCALE;
                const facadeDirection = building.position[2] > 0 ? -1 : 1;
                const scaledCenterZ =
                  bounds.localCenterZ * DISTRICT_FACADE_PRESENTATION_SCALE;
                return (
                  <CuboidCollider
                    args={[
                      bounds.halfWidth * DISTRICT_FACADE_PRESENTATION_SCALE,
                      scaledHalfHeight,
                      bounds.halfDepth * DISTRICT_FACADE_PRESENTATION_SCALE,
                    ]}
                    key={building.id}
                    position={[
                      building.position[0],
                      scaledHalfHeight,
                      building.position[2] + facadeDirection * scaledCenterZ,
                    ]}
                  />
                );
              })}
              <CuboidCollider
                args={[0.75, 0.72, 0.5]}
                position={[0, 0.72, -2.35]}
                ref={archiveEvidenceTableColliderRef}
              />
            </RigidBody>
            <ArchiveZone profile={graphicsProfile} />
            <ZoneReadinessSignal zoneId="archive-antechamber" />
            <PostRoadZone
              profile={graphicsProfile}
              reducedMotion={reducedMotion}
            />
            <ZoneReadinessSignal zoneId="post-road-square" />
            <CivicZone profile={graphicsProfile} reducedMotion={reducedMotion} />
            <ZoneReadinessSignal zoneId="royal-lodging-civic-area" />
            <BridgeZone />
            <ZoneReadinessSignal zoneId="bridge-approach" />
            <ThirdPersonCameraRig
              cameraInputChannel={cameraInputChannel}
              cameraNonBlockingColliderRef={archiveEvidenceTableColliderRef}
              controllerRef={controllerRef}
              inputEnabled={locomotionEnabled}
              preferences={cameraPreferences}
              reducedMotion={reducedMotion}
              telemetryEnabled={telemetryEnabled}
            />
            {telemetryEnabled ? <SceneSubjectTelemetry /> : null}
            <InvestigatorController
              controllerRef={controllerRef}
              enabled={locomotionEnabled}
              graphicsProfile={graphicsProfile}
              initialPosition={initialPosition}
              movementResetGeneration={movementResetGeneration}
              onControllerReady={onControllerReady}
              onPositionChange={onPlayerPositionChange}
              reducedMotion={reducedMotion}
            />
          </Physics>
          <CameraFacadeOcclusion
            controllerRef={controllerRef}
            telemetryEnabled={telemetryEnabled}
          />
        </Suspense>
        <WorldPostProcessing profile={graphicsProfile} />
        {testMode ? null : (
          <PerformanceSampler onSample={onPerformanceSample} />
        )}
      </ZoneReadinessRegistry>
    </Canvas>
  );
}
