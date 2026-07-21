"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { Suspense } from "react";

import type { GraphicsProfile } from "@/lib/world/graphics-profile";

import { OptionalAssetBoundary } from "./optional-asset-boundary";

type LanternKey = Readonly<{
  color: "#f2a655";
  decay: 2;
  distance: 11;
  intensity: number;
  position: readonly [number, number, number];
}>;

export type WorldLightingConfig = Readonly<{
  backgroundColor: "#3b3542";
  fogColor: "#584e57";
  fogNear: number;
  fogFar: number;
  environment: Readonly<{
    fillColor: "#8d87a8";
    fillIntensity: number;
    groundColor: "#332c25";
    keyColor: "#f2b880";
    keyIntensity: number;
    hdriFile: string | null;
    hdriBackgroundIntensity: number;
    hdriEnvironmentIntensity: number;
    shadowsEnabled: boolean;
    shadowMapSize: number;
  }>;
  lanternKeys: readonly LanternKey[];
  contactShadows: boolean;
}>;

const HIGH_LANTERN_POSITIONS = [
  [2, 2.15, 3.25],
  [32, 2.15, 3.25],
  [61, 2.15, 3.25],
] as const;

const BALANCED_LANTERN_POSITIONS = [
  [2, 2.15, 3.25],
  [47, 2.15, -3.25],
] as const;

function createLanternKeys(
  positions: readonly (readonly [number, number, number])[],
): readonly LanternKey[] {
  return positions.map((position) => ({
    color: "#f2a655",
    decay: 2,
    distance: 11,
    intensity: 8,
    position,
  }));
}

export function selectWorldLightingConfig(
  profile: GraphicsProfile,
): WorldLightingConfig {
  const enhanced = profile.tier !== "classroom";
  const positions =
    profile.tier === "high"
      ? HIGH_LANTERN_POSITIONS
      : profile.tier === "balanced"
        ? BALANCED_LANTERN_POSITIONS
        : [];

  // A warm low sun key against a cool lavender fill matches the licensed dusk
  // sky instead of fighting it with a steel-blue grade.
  return {
    backgroundColor: "#3b3542",
    fogColor: "#584e57",
    fogNear: profile.fog.near,
    fogFar: profile.fog.far,
    environment: {
      fillColor: "#8d87a8",
      fillIntensity: enhanced ? 0.62 : 1.7,
      groundColor: "#332c25",
      keyColor: "#f2b880",
      keyIntensity: enhanced ? 1.55 : 2.35,
      hdriFile: enhanced
        ? "/world/hdris/qwantani-dusk-2-puresky/qwantani_dusk_2_puresky_1k.hdr"
        : null,
      hdriBackgroundIntensity: enhanced ? 0.27 : 0,
      hdriEnvironmentIntensity: enhanced ? 0.52 : 0,
      shadowsEnabled: enhanced && profile.shadows.enabled,
      shadowMapSize: profile.shadows.mapSize,
    },
    lanternKeys: createLanternKeys(positions),
    contactShadows: enhanced && profile.contactShadows,
  };
}

function EnvironmentLighting({
  config,
  solidBackground,
}: {
  config: WorldLightingConfig;
  solidBackground: boolean;
}) {
  return (
    <>
      {solidBackground ? (
        <color attach="background" args={[config.backgroundColor]} />
      ) : null}
      <fog
        attach="fog"
        args={[config.fogColor, config.fogNear, config.fogFar]}
      />
      <hemisphereLight
        color={config.environment.fillColor}
        groundColor={config.environment.groundColor}
        intensity={config.environment.fillIntensity}
        name="world-dusk-fill"
      />
    </>
  );
}

function ClassroomLighting({ config }: { config: WorldLightingConfig }) {
  return (
    <>
      <EnvironmentLighting config={config} solidBackground />
      <directionalLight
        castShadow={false}
        color={config.environment.keyColor}
        intensity={config.environment.keyIntensity}
        name="world-dusk-key"
        position={[46, 15, 12]}
      />
    </>
  );
}

function EnhancedLighting({ config }: { config: WorldLightingConfig }) {
  return (
    <>
      <EnvironmentLighting config={config} solidBackground={false} />
      {config.environment.hdriFile ? (
        <Environment
          background
          backgroundBlurriness={0.22}
          backgroundIntensity={config.environment.hdriBackgroundIntensity}
          environmentIntensity={config.environment.hdriEnvironmentIntensity}
          files={config.environment.hdriFile}
        />
      ) : null}
      <directionalLight
        castShadow={config.environment.shadowsEnabled}
        color={config.environment.keyColor}
        intensity={config.environment.keyIntensity}
        name="world-dusk-key"
        position={[46, 15, 12]}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-20}
        shadow-camera-far={90}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={20}
        shadow-mapSize-height={config.environment.shadowMapSize}
        shadow-mapSize-width={config.environment.shadowMapSize}
      />
      {config.lanternKeys.map((key, index) => (
        <pointLight
          color={key.color}
          decay={key.decay}
          distance={key.distance}
          intensity={key.intensity}
          key={`${key.position.join("-")}-${index}`}
          name="world-lantern-key"
          position={[...key.position]}
        />
      ))}
      {config.contactShadows ? (
        <ContactShadows
          blur={2.1}
          far={36}
          frames={1}
          opacity={0.44}
          position={[36, 0.035, 0]}
          resolution={Math.min(config.environment.shadowMapSize, 1024)}
          scale={100}
        />
      ) : null}
    </>
  );
}

export function WorldLighting({ profile }: { profile: GraphicsProfile }) {
  const config = selectWorldLightingConfig(profile);

  if (profile.tier === "classroom") {
    return <ClassroomLighting config={config} />;
  }

  // The HDR image improves the enhanced profiles, but the playable scene must
  // remain ready when a browser cannot fetch or decode that optional asset.
  const fallback = <ClassroomLighting config={config} />;

  return (
    <OptionalAssetBoundary
      assetId="world-hdri-environment"
      fallback={fallback}
    >
      <Suspense fallback={fallback}>
        <EnhancedLighting config={config} />
      </Suspense>
    </OptionalAssetBoundary>
  );
}
