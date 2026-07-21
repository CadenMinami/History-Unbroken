import { Box3, Object3D, Raycaster, Vector3 } from "three";

const OCCLUSION_TARGET_PADDING = 0.08;
const OCCLUSION_VOLUME_PADDING = 0.02;

export interface CameraFacadeOcclusionInput {
  cameraPosition: Vector3;
  facades: readonly Object3D[];
  target: Vector3;
  targets?: readonly Vector3[];
}

export interface FacadeCameraDistanceInput {
  facades: readonly Object3D[];
  minimumDistance?: number;
  requestedDistance: number;
  requestedPosition: Vector3;
  target: Vector3;
}

const raycaster = new Raycaster();
const direction = new Vector3();
const facadeBounds = new Box3();
const facadeRayHit = new Vector3();
const collisionDirection = new Vector3();
const collisionFacadeBounds = new Box3();
const collisionRayHit = new Vector3();

function withVisibleFacadeBounds(
  facade: Object3D,
  bounds: Box3,
): Box3 {
  const wasVisible = facade.visible;
  facade.visible = true;
  bounds.setFromObject(facade).expandByScalar(OCCLUSION_VOLUME_PADDING);
  facade.visible = wasVisible;
  return bounds;
}

/**
 * Resolves a requested third-person camera distance before the camera enters
 * a presentation facade. This is intentionally a geometry guard, not a
 * visibility trick: the facade stays rendered and the camera moves forward.
 */
export function resolveFacadeCameraDistance({
  facades,
  minimumDistance = 0,
  requestedDistance,
  requestedPosition,
  target,
}: FacadeCameraDistanceInput): number {
  if (!Number.isFinite(requestedDistance) || requestedDistance <= 0) {
    return requestedDistance;
  }

  collisionDirection.subVectors(requestedPosition, target);
  const segmentLength = collisionDirection.length();
  if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
    return requestedDistance;
  }

  collisionDirection.multiplyScalar(1 / segmentLength);
  let resolvedDistance = requestedDistance;

  for (const facade of facades) {
    const bounds = withVisibleFacadeBounds(facade, collisionFacadeBounds);
    if (bounds.isEmpty()) continue;

    if (bounds.containsPoint(target)) {
      return Math.min(resolvedDistance, minimumDistance);
    }

    const intersection = raycaster.ray
      .set(target, collisionDirection)
      .intersectBox(bounds, collisionRayHit);
    if (intersection === null) continue;

    const distanceToFacade = intersection.distanceTo(target);
    if (
      !Number.isFinite(distanceToFacade) ||
      distanceToFacade > segmentLength ||
      distanceToFacade <= OCCLUSION_TARGET_PADDING
    ) {
      continue;
    }

    resolvedDistance = Math.min(
      resolvedDistance,
      Math.max(minimumDistance, distanceToFacade - OCCLUSION_TARGET_PADDING),
    );
  }

  return resolvedDistance;
}

/**
 * Finds presentation-only facade groups between the active camera and the
 * investigator. Physics keeps the camera outside walls; this closes the
 * remaining line-of-sight case when a facade would still cover the player.
 */
export function collectCameraOccludingFacades({
  cameraPosition,
  facades,
  target,
  targets = [],
}: CameraFacadeOcclusionInput): readonly Object3D[] {
  return facades.filter((facade) => {
    const previousVisibility = facade.visible;
    withVisibleFacadeBounds(facade, facadeBounds);
    const blocksSightLine = [target, ...targets].some((visibilityTarget) => {
      direction.subVectors(visibilityTarget, cameraPosition);
      const targetDistance = direction.length();
      if (
        !Number.isFinite(targetDistance) ||
        targetDistance <= OCCLUSION_TARGET_PADDING
      ) {
        return false;
      }

      raycaster.set(
        cameraPosition,
        direction.multiplyScalar(1 / targetDistance),
      );
      raycaster.near = 0;
      raycaster.far = targetDistance - OCCLUSION_TARGET_PADDING;

      const cameraStartsInsideFacade = facadeBounds.containsPoint(
        cameraPosition,
      );
      const intersection = raycaster.ray.intersectBox(
        facadeBounds,
        facadeRayHit,
      );
      return (
        cameraStartsInsideFacade ||
        (intersection !== null &&
          intersection.distanceTo(cameraPosition) <= raycaster.far)
      );
    });
    facade.visible = previousVisibility;
    return blocksSightLine;
  });
}

export function applyFacadeOcclusion(
  facades: readonly Object3D[],
  occludingFacades: readonly Object3D[],
): void {
  const occluding = new Set(occludingFacades);
  for (const facade of facades) {
    facade.visible = !occluding.has(facade);
  }
}
