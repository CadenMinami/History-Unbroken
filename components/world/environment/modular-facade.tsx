"use client";

import { useEffect, useMemo } from "react";
import { Color, Shape, ShapeGeometry } from "three";

import type { TextureTier } from "@/lib/world/graphics-profile";

import {
  DISTRICT_FACADE_PRESENTATION_SCALE,
  type DistrictFacadePlacement,
} from "./district-layout";
import {
  FacadeSurfaceMaterial,
  getScaleAwareFacadeRepeat,
  selectFacadePbrFamily,
} from "./pbr-surface-material";

type ModularFacadeProps = Readonly<{
  placement: DistrictFacadePlacement;
  castShadow?: boolean;
  textureTier?: TextureTier;
}>;

type FacadeWindowProps = Readonly<{
  id: string;
  lit: boolean;
  position: readonly [number, number, number];
  trim: string;
  windowColor: string;
  narrow?: boolean;
}>;

const WALL_BASE_Y = 0.42;
const ROOF_PITCH = 0.48;
const ROOF_THICKNESS = 0.16;
const ROOF_OVERHANG = 0.28;
const ROOF_EAVE_CLEARANCE = 0.035;
const FACADE_SURFACE_DEPTH = 0.16;
const FACADE_BASE_DEPTH = 0.18;
const ROOF_FRONT_OVERHANG = 0.3;
const ROOF_BACK_OVERHANG = 0.15;
const MAX_FRONT_FIXTURE_PROJECTION = 0.2;

type PitchedRoofPanelLayout = Readonly<{
  eaveBottomY: number;
  lowestPointY: number;
  position: readonly [number, number, number];
  ridgeEdgeX: number;
  rotationZ: number;
  size: readonly [number, number, number];
}>;

type PitchedRoofLayout = Readonly<{
  panels: readonly [PitchedRoofPanelLayout, PitchedRoofPanelLayout];
  ridgeCap: Readonly<{
    position: readonly [number, number, number];
    size: readonly [number, number, number];
    width: number;
  }>;
  gable: Readonly<{
    apexY: number;
    baseY: number;
    eaveY: number;
    halfWidth: number;
  }>;
  centerZ: number;
  wallTopY: number;
}>;

export function getFacadeShellLayout(depth: number): Readonly<{
  backZ: number;
  bodyCenterZ: number;
  facadeCenterZ: number;
  facadeDepth: number;
  frontZ: number;
  roofCenterZ: number;
  roofDepth: number;
}> {
  const frontZ = depth / 2 + 0.09;
  const backZ = frontZ - depth;
  const roofFrontZ = frontZ + ROOF_FRONT_OVERHANG;
  const roofBackZ = backZ - ROOF_BACK_OVERHANG;
  const roofDepth = roofFrontZ - roofBackZ;

  return {
    backZ,
    bodyCenterZ: (frontZ + backZ) / 2,
    facadeCenterZ: frontZ - FACADE_SURFACE_DEPTH / 2,
    facadeDepth: FACADE_SURFACE_DEPTH,
    frontZ,
    roofCenterZ: (roofFrontZ + roofBackZ) / 2,
    roofDepth,
  };
}

export function getFacadeVisualFootprint(
  width: number,
  depth: number,
): Readonly<{
  halfDepth: number;
  halfWidth: number;
}> {
  const shell = getFacadeShellLayout(depth);
  return {
    halfDepth: shell.roofDepth / 2,
    halfWidth: width / 2 + ROOF_OVERHANG,
  };
}

export function getFacadeVisualBounds({
  depth,
  wallHeight,
  width,
}: Readonly<{
  depth: number;
  wallHeight: number;
  width: number;
}>): Readonly<{
  halfDepth: number;
  halfHeight: number;
  halfWidth: number;
  localCenterZ: number;
  maxY: number;
}> {
  const footprint = getFacadeVisualFootprint(width, depth);
  const roof = getPitchedRoofLayout({ depth, wallHeight, width });
  const roofTopY = roof.ridgeCap.position[1] + roof.ridgeCap.size[1] / 2;
  const chimneyTopY = wallHeight + 1.2 + 1.34 / 2;
  const maxY = Math.max(roofTopY, chimneyTopY);
  const shell = getFacadeShellLayout(depth);
  const backZ = Math.min(shell.backZ, shell.roofCenterZ - shell.roofDepth / 2);
  const frontZ = Math.max(
    shell.frontZ + MAX_FRONT_FIXTURE_PROJECTION,
    shell.roofCenterZ + shell.roofDepth / 2,
  );

  return {
    halfDepth: (frontZ - backZ) / 2,
    halfHeight: maxY / 2,
    halfWidth: footprint.halfWidth,
    localCenterZ: (frontZ + backZ) / 2,
    maxY,
  };
}

/**
 * Produces a roof that sits on top of a facade wall instead of extending
 * through it. The small ridge gap avoids coplanar roof halves and is covered
 * by a separate cap.
 */
export function getPitchedRoofLayout({
  depth,
  wallHeight,
  width,
}: Readonly<{
  depth: number;
  wallHeight: number;
  width: number;
}>): PitchedRoofLayout {
  const wallTopY = wallHeight + WALL_BASE_Y;
  const footprint = getFacadeVisualFootprint(width, depth);
  const shell = getFacadeShellLayout(depth);
  const halfSpan = footprint.halfWidth;
  const ridgeGap = ROOF_THICKNESS * Math.sin(ROOF_PITCH) + 0.06;
  const innerEdgeX = ridgeGap / 2;
  const horizontalRun = halfSpan - innerEdgeX;
  const panelLength = horizontalRun / Math.cos(ROOF_PITCH);
  const rise = horizontalRun * Math.tan(ROOF_PITCH);
  const eaveBottomY = wallTopY + ROOF_EAVE_CLEARANCE;
  const panelCenterY =
    eaveBottomY + rise / 2 + (ROOF_THICKNESS * Math.cos(ROOF_PITCH)) / 2;
  const panelCenterX = (halfSpan + innerEdgeX) / 2;
  const panelDepth = shell.roofDepth;
  const ridgeY = eaveBottomY + rise;
  const panelSize = [panelLength, ROOF_THICKNESS, panelDepth] as const;

  const createPanel = (side: -1 | 1): PitchedRoofPanelLayout => ({
    eaveBottomY,
    lowestPointY: eaveBottomY,
    position: [side * panelCenterX, panelCenterY, shell.roofCenterZ],
    ridgeEdgeX: side * innerEdgeX,
    rotationZ: -side * ROOF_PITCH,
    size: panelSize,
  });
  const panels = [createPanel(-1), createPanel(1)] as const;

  return {
    centerZ: shell.roofCenterZ,
    panels,
    ridgeCap: {
      position: [0, ridgeY + ROOF_THICKNESS / 2, shell.roofCenterZ],
      size: [ridgeGap + 0.12, ROOF_THICKNESS, panelDepth + 0.08],
      width: ridgeGap + 0.12,
    },
    gable: {
      apexY: ridgeY,
      baseY: wallTopY,
      eaveY: eaveBottomY + (halfSpan - width / 2) * Math.tan(ROOF_PITCH),
      halfWidth: width / 2,
    },
    wallTopY,
  };
}

function FacadeWindow({
  id,
  lit,
  position,
  trim,
  windowColor,
  narrow = false,
}: FacadeWindowProps) {
  const width = narrow ? 0.58 : 0.82;
  return (
    <group name="recessed-window" position={position}>
      <mesh position={[0, 0, -0.055]}>
        <boxGeometry args={[width + 0.18, 1.22, 0.16]} />
        <meshStandardMaterial color="#252a2a" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[width, 1.04, 0.075]} />
        <meshStandardMaterial
          color={lit ? windowColor : "#26343b"}
          emissive={lit ? "#bc6f2c" : "#0c1418"}
          emissiveIntensity={lit ? 0.72 : 0.08}
          metalness={0.03}
          roughness={0.42}
        />
      </mesh>
      <mesh name={`${id}-window-vertical`} position={[0, 0, 0.095]}>
        <boxGeometry args={[0.055, 1.07, 0.055]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
      <mesh name={`${id}-window-horizontal`} position={[0, 0, 0.095]}>
        <boxGeometry args={[width + 0.02, 0.055, 0.055]} />
        <meshStandardMaterial color={trim} roughness={0.88} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          castShadow
          key={side}
          position={[side * (width / 2 + 0.16), 0, 0.035]}
        >
          <boxGeometry args={[0.2, 1.2, 0.12]} />
          <meshStandardMaterial color={trim} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[0, -0.66, 0.04]}>
        <boxGeometry args={[width + 0.32, 0.12, 0.26]} />
        <meshStandardMaterial color="#777269" roughness={0.98} />
      </mesh>
    </group>
  );
}

function PitchedRoof({
  castShadow,
  depth,
  height,
  roof,
  textureTier,
  wallColor,
  width,
}: Readonly<{
  castShadow: boolean;
  depth: number;
  height: number;
  roof: string;
  textureTier: TextureTier;
  wallColor: string;
  width: number;
}>) {
  const layout = getPitchedRoofLayout({
    depth,
    wallHeight: height,
    width,
  });
  const roofRepeat = getScaleAwareFacadeRepeat("roof", [
    layout.panels[0].size[0],
    layout.panels[0].size[2],
  ]);
  const shell = getFacadeShellLayout(depth);
  // Clearly darker than the wall so the flat-shaded gable reads as a shaded
  // attic end instead of a bright bare triangle.
  const gableColor = useMemo(
    () => new Color(wallColor).multiplyScalar(0.42),
    [wallColor],
  );
  const gableGeometry = useMemo(() => {
    const { apexY, baseY, eaveY, halfWidth } = layout.gable;
    const shape = new Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(halfWidth, eaveY - baseY);
    shape.lineTo(0, apexY - baseY);
    shape.lineTo(-halfWidth, eaveY - baseY);
    shape.closePath();
    return new ShapeGeometry(shape);
  }, [layout.gable]);

  useEffect(() => () => gableGeometry.dispose(), [gableGeometry]);

  return (
    <group name="pitched-roof">
      {layout.panels.map((panel, index) => (
        <mesh
          castShadow={castShadow}
          key={panel.rotationZ}
          name={`roof-panel-${index}`}
          position={panel.position}
          receiveShadow
          rotation={[0, 0, panel.rotationZ]}
        >
          <boxGeometry args={panel.size} />
          <FacadeSurfaceMaterial
            color={roof}
            family="roof"
            repeat={roofRepeat}
            textureTier={textureTier}
          />
        </mesh>
      ))}
      <mesh
        castShadow={castShadow}
        name="roof-ridge-cap"
        position={layout.ridgeCap.position}
      >
        <boxGeometry args={layout.ridgeCap.size} />
        <meshStandardMaterial color="#494039" roughness={0.95} />
      </mesh>
      <mesh
        geometry={gableGeometry}
        name="roof-gable-front"
        position={[0, layout.gable.baseY, shell.frontZ + 0.012]}
      >
        <meshStandardMaterial color={gableColor} roughness={0.95} />
      </mesh>
      <mesh
        geometry={gableGeometry}
        name="roof-gable-back"
        position={[0, layout.gable.baseY, shell.backZ - 0.012]}
        rotation={[0, Math.PI, 0]}
      >
        <meshStandardMaterial color={gableColor} roughness={0.95} />
      </mesh>
    </group>
  );
}

function FamilyDetails({
  castShadow,
  placement,
}: Readonly<{
  castShadow: boolean;
  placement: DistrictFacadePlacement;
}>) {
  const [width, height, depth] = placement.size;
  const frontZ = getFacadeShellLayout(depth).frontZ;
  const trimMaterial = (
    <meshStandardMaterial color={placement.palette.trim} roughness={0.95} />
  );

  if (placement.family === "timber-front") {
    return (
      <group name="timber-frame-detail">
        {[-0.34, 0.34].map((xRatio) => (
          <mesh
            castShadow={castShadow}
            key={xRatio}
            name="timber-beam"
            position={[width * xRatio, height * 0.55 + 0.45, frontZ]}
          >
            <boxGeometry args={[0.2, height * 0.88, 0.14]} />
            {trimMaterial}
          </mesh>
        ))}
        {[height * 0.32, height * 0.68].map((yRatio) => (
          <mesh
            castShadow={castShadow}
            key={yRatio}
            name="timber-beam"
            position={[0, yRatio + 0.45, frontZ]}
          >
            <boxGeometry args={[width * 0.94, 0.18, 0.14]} />
            {trimMaterial}
          </mesh>
        ))}
      </group>
    );
  }

  if (placement.family === "stone-civic") {
    return (
      <group name="civic-masonry-detail">
        {Array.from({ length: 4 }, (_, index) => (
          <mesh
            key={index}
            name="stone-course"
            position={[0, 0.78 + index * 0.74, frontZ]}
          >
            <boxGeometry args={[width * 0.96, 0.08, 0.12]} />
            <meshStandardMaterial
              color={placement.palette.stone}
              roughness={0.99}
            />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh
            castShadow={castShadow}
            key={side}
            position={[side * (width / 2 - 0.18), height * 0.5 + 0.45, frontZ]}
          >
            <boxGeometry args={[0.34, height * 0.92, 0.2]} />
            <meshStandardMaterial
              color={placement.palette.stone}
              roughness={0.98}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (placement.family === "shopfront") {
    return (
      <group name="shopfront-detail">
        <mesh
          castShadow={castShadow}
          name="shop-canopy"
          position={[0, 2.12, frontZ + 0.42]}
          rotation={[0.16, 0, 0]}
        >
          <boxGeometry args={[width * 0.74, 0.14, 0.92]} />
          <meshStandardMaterial color={placement.palette.trim} roughness={0.9} />
        </mesh>
        {[-0.31, 0.31].map((xRatio) => (
          <mesh key={xRatio} position={[width * xRatio, 1.35, frontZ + 0.03]}>
            <boxGeometry args={[width * 0.22, 1.25, 0.12]} />
            <meshStandardMaterial color="#29363b" roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  return null;
}

export function ModularFacade({
  placement,
  castShadow = true,
  textureTier,
}: ModularFacadeProps) {
  const [width, height, depth] = placement.size;
  const shell = getFacadeShellLayout(depth);
  const frontZ = shell.frontZ;
  const windowCount =
    placement.family === "narrow-row"
      ? 2
      : Math.max(2, Math.min(3, Math.floor(width / 2)));
  const windowXs = Array.from(
    { length: windowCount },
    (_, index) => ((index + 1) * width) / (windowCount + 1) - width / 2,
  );
  const facesRoadFromNorth = placement.position[2] > 0;
  const resolvedTextureTier = textureTier ?? "low";
  const wallFamily = selectFacadePbrFamily(placement.family);
  // A darker damp base course visually anchors the building to the ground.
  const plinthColor = useMemo(
    () => `#${new Color(placement.palette.stone).multiplyScalar(0.58).getHexString()}`,
    [placement.palette.stone],
  );

  return (
    <group
      name={`facade-${placement.id}`}
      position={placement.position}
      rotation={[0, facesRoadFromNorth ? Math.PI : 0, 0]}
      userData={{ cameraOcclusion: true }}
      scale={[
        DISTRICT_FACADE_PRESENTATION_SCALE,
        DISTRICT_FACADE_PRESENTATION_SCALE,
        DISTRICT_FACADE_PRESENTATION_SCALE,
      ]}
    >
      <mesh
        castShadow={castShadow}
        name="facade-body"
        position={[0, (height + WALL_BASE_Y) / 2 - 0.08, shell.bodyCenterZ]}
        receiveShadow
      >
        <boxGeometry args={[width, height + WALL_BASE_Y + 0.16, depth]} />
        <FacadeSurfaceMaterial
          color={placement.palette.wall}
          family={wallFamily}
          repeat={getScaleAwareFacadeRepeat(wallFamily, [width, height])}
          textureTier={resolvedTextureTier}
        />
      </mesh>
      <mesh
        castShadow={castShadow}
        position={[0, 0.22, shell.frontZ - FACADE_BASE_DEPTH / 2 + 0.04]}
        receiveShadow
      >
        <boxGeometry args={[width + 0.2, 0.44, FACADE_BASE_DEPTH]} />
        <FacadeSurfaceMaterial
          color={plinthColor}
          family="stone"
          repeat={getScaleAwareFacadeRepeat("stone", [width + 0.2, 0.44])}
          textureTier={resolvedTextureTier}
        />
      </mesh>
      <PitchedRoof
        castShadow={castShadow}
        depth={depth}
        height={height}
        roof={placement.palette.roof}
        textureTier={resolvedTextureTier}
        wallColor={placement.palette.wall}
        width={width}
      />
      <mesh
        castShadow={castShadow}
        name="facade-door"
        position={[0, 1.42, frontZ]}
      >
        <boxGeometry args={[0.94, 2, 0.15]} />
        <meshStandardMaterial color={placement.palette.trim} roughness={0.94} />
      </mesh>
      <mesh position={[0.3, 1.42, frontZ + 0.1]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#ad8a51" metalness={0.45} roughness={0.5} />
      </mesh>
      {windowXs.map((x, index) => (
        <FacadeWindow
          id={`${placement.id}-${index}`}
          key={`${placement.id}-window-${index}`}
          lit={placement.litWindowIndices.includes(index)}
          narrow={placement.family === "narrow-row"}
          position={[x, height * 0.65 + 0.42, frontZ]}
          trim={placement.palette.trim}
          windowColor={placement.palette.window}
        />
      ))}
      <FamilyDetails castShadow={castShadow} placement={placement} />
      <mesh
        castShadow={castShadow}
        position={[width * 0.28, height + 1.2, shell.roofCenterZ]}
      >
        <boxGeometry args={[0.42, 1.34, 0.36]} />
        <meshStandardMaterial color="#55514c" roughness={0.98} />
      </mesh>
    </group>
  );
}
