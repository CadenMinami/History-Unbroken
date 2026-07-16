import {
  SPATIAL_SESSION_VERSION,
  type InvestigationMode,
  type SpatialSessionEnvelope,
  spatialSessionEnvelopeSchema,
} from "@/schemas/spatial-session";
import type { SceneManifest } from "@/schemas/world-manifest";

export const SPATIAL_SESSION_STORAGE_KEY =
  "history-unbroken:varennes:spatial-session";

export type SpatialRestoreReason =
  | "invalid_json"
  | "invalid_envelope"
  | "session_version_mismatch"
  | "case_mismatch"
  | "scene_manifest_version_mismatch"
  | "removed_zone"
  | "removed_spawn";

export type SpatialRestoreResult =
  | {
      session: SpatialSessionEnvelope;
      discarded: false;
    }
  | {
      session: SpatialSessionEnvelope;
      discarded: true;
      reason: SpatialRestoreReason;
    };

export type SafeSpawnReference = SpatialSessionEnvelope["lastSafeSpawn"];
export type AuthoredSafeSpawn = SceneManifest["zones"][number]["safeSpawns"][number] & {
  zoneId: SceneManifest["zones"][number]["zoneId"];
};

export type SpatialTransitionRejectionReason =
  | "invalid_session"
  | "unknown_zone"
  | "unknown_spawn"
  | "zone_not_discovered"
  | "fast_travel_locked";

export type SpatialTransitionResult =
  | {
      accepted: true;
      session: SpatialSessionEnvelope;
      safeSpawn: AuthoredSafeSpawn;
    }
  | {
      accepted: false;
      session: SpatialSessionEnvelope;
      reason: SpatialTransitionRejectionReason;
    };

function findManifestZone(
  manifest: SceneManifest,
  zoneId: SafeSpawnReference["zoneId"],
): SceneManifest["zones"][number] | undefined {
  return manifest.zones.find((zone) => zone.zoneId === zoneId);
}

export function resolveAuthoredSafeSpawn(
  manifest: SceneManifest,
  reference: SafeSpawnReference,
): AuthoredSafeSpawn | null {
  const zone = findManifestZone(manifest, reference.zoneId);
  const spawn = zone?.safeSpawns.find(
    (candidate) => candidate.spawnId === reference.spawnId,
  );
  return zone && spawn
    ? { zoneId: zone.zoneId, ...spawn, position: [...spawn.position] }
    : null;
}

function isSessionCompatibleWithManifest(
  manifest: SceneManifest,
  session: SpatialSessionEnvelope,
): boolean {
  const parsed = spatialSessionEnvelopeSchema.safeParse(session);
  if (!parsed.success) return false;
  if (
    parsed.data.caseId !== manifest.caseId ||
    parsed.data.caseVersion !== manifest.caseVersion ||
    parsed.data.sceneManifestVersion !== manifest.sceneManifestVersion
  ) {
    return false;
  }

  return (
    parsed.data.discoveredZoneIds.every((zoneId) =>
      manifest.zones.some((zone) => zone.zoneId === zoneId),
    ) && resolveAuthoredSafeSpawn(manifest, parsed.data.lastSafeSpawn) !== null
  );
}

function rejectedTransition(
  session: SpatialSessionEnvelope,
  reason: SpatialTransitionRejectionReason,
): SpatialTransitionResult {
  return { accepted: false, session, reason };
}

function acceptedTransition(
  session: SpatialSessionEnvelope,
  safeSpawn: AuthoredSafeSpawn,
  discoveredZoneIds: SpatialSessionEnvelope["discoveredZoneIds"],
): SpatialTransitionResult {
  const parsed = spatialSessionEnvelopeSchema.safeParse({
    ...session,
    discoveredZoneIds,
    lastSafeSpawn: {
      zoneId: safeSpawn.zoneId,
      spawnId: safeSpawn.spawnId,
    },
  });
  if (!parsed.success) return rejectedTransition(session, "invalid_session");
  return { accepted: true, session: parsed.data, safeSpawn };
}

export function recordZoneVisit(
  manifest: SceneManifest,
  session: SpatialSessionEnvelope,
  destination: SafeSpawnReference,
): SpatialTransitionResult {
  if (!isSessionCompatibleWithManifest(manifest, session)) {
    return rejectedTransition(session, "invalid_session");
  }

  const zone = findManifestZone(manifest, destination.zoneId);
  if (!zone) return rejectedTransition(session, "unknown_zone");

  const safeSpawn = resolveAuthoredSafeSpawn(manifest, destination);
  if (!safeSpawn) return rejectedTransition(session, "unknown_spawn");

  const discoveredZoneIds = session.discoveredZoneIds.includes(zone.zoneId)
    ? [...session.discoveredZoneIds]
    : [...session.discoveredZoneIds, zone.zoneId];
  return acceptedTransition(session, safeSpawn, discoveredZoneIds);
}

export function canFastTravelToZone(
  manifest: SceneManifest,
  session: SpatialSessionEnvelope,
  zoneId: SafeSpawnReference["zoneId"],
): boolean {
  if (!isSessionCompatibleWithManifest(manifest, session)) return false;
  const zone = findManifestZone(manifest, zoneId);
  return Boolean(
    zone &&
      session.discoveredZoneIds.includes(zone.zoneId) &&
      zone.fastTravelUnlock === "first_valid_visit",
  );
}

export function requestFastTravel(
  manifest: SceneManifest,
  session: SpatialSessionEnvelope,
  destination: SafeSpawnReference,
): SpatialTransitionResult {
  if (!isSessionCompatibleWithManifest(manifest, session)) {
    return rejectedTransition(session, "invalid_session");
  }

  const zone = findManifestZone(manifest, destination.zoneId);
  if (!zone) return rejectedTransition(session, "unknown_zone");
  if (!session.discoveredZoneIds.includes(zone.zoneId)) {
    return rejectedTransition(session, "zone_not_discovered");
  }
  if (zone.fastTravelUnlock !== "first_valid_visit") {
    return rejectedTransition(session, "fast_travel_locked");
  }

  const safeSpawn = resolveAuthoredSafeSpawn(manifest, destination);
  if (!safeSpawn) return rejectedTransition(session, "unknown_spawn");
  return acceptedTransition(session, safeSpawn, [...session.discoveredZoneIds]);
}

function discarded(
  manifest: SceneManifest,
  reason: SpatialRestoreReason,
): SpatialRestoreResult {
  return {
    session: createInitialSpatialSession(manifest),
    discarded: true,
    reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createInitialSpatialSession(
  manifest: SceneManifest,
): SpatialSessionEnvelope {
  return spatialSessionEnvelopeSchema.parse({
    spatialSessionVersion: SPATIAL_SESSION_VERSION,
    caseId: manifest.caseId,
    caseVersion: manifest.caseVersion,
    sceneManifestVersion: manifest.sceneManifestVersion,
    mode: "spatial",
    lastSafeSpawn: manifest.initialSpawn,
    discoveredZoneIds: [manifest.initialSpawn.zoneId],
    guidanceSetting: "subtle",
    graphicsTier: "balanced",
  });
}

export function serializeSpatialSession(session: SpatialSessionEnvelope): string {
  return JSON.stringify(spatialSessionEnvelopeSchema.parse(session));
}

export function updateGuidanceSetting(
  session: SpatialSessionEnvelope,
  guidanceSetting: SpatialSessionEnvelope["guidanceSetting"],
): SpatialSessionEnvelope {
  return spatialSessionEnvelopeSchema.parse({ ...session, guidanceSetting });
}

export function persistInvestigationMode(
  storage: Pick<Storage, "getItem" | "setItem">,
  manifest: SceneManifest,
  mode: InvestigationMode,
): SpatialSessionEnvelope {
  const serialized = storage.getItem(SPATIAL_SESSION_STORAGE_KEY);
  const current = serialized
    ? restoreSpatialSession(manifest, serialized).session
    : createInitialSpatialSession(manifest);
  const next = spatialSessionEnvelopeSchema.parse({ ...current, mode });
  storage.setItem(SPATIAL_SESSION_STORAGE_KEY, serializeSpatialSession(next));
  return next;
}

export function restoreSpatialSession(
  manifest: SceneManifest,
  serialized: string,
): SpatialRestoreResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized);
  } catch {
    return discarded(manifest, "invalid_json");
  }

  if (!isRecord(candidate)) return discarded(manifest, "invalid_envelope");
  if (candidate.spatialSessionVersion !== SPATIAL_SESSION_VERSION) {
    return discarded(manifest, "session_version_mismatch");
  }
  if (
    candidate.caseId !== manifest.caseId ||
    candidate.caseVersion !== manifest.caseVersion
  ) {
    return discarded(manifest, "case_mismatch");
  }
  if (candidate.sceneManifestVersion !== manifest.sceneManifestVersion) {
    return discarded(manifest, "scene_manifest_version_mismatch");
  }

  const zoneById = new Map(manifest.zones.map((zone) => [zone.zoneId, zone]));
  const discoveredZoneIds = candidate.discoveredZoneIds;
  const lastSafeSpawn = candidate.lastSafeSpawn;
  if (
    Array.isArray(discoveredZoneIds) &&
    discoveredZoneIds.some(
      (zoneId) => typeof zoneId === "string" && !zoneById.has(zoneId as never),
    )
  ) {
    return discarded(manifest, "removed_zone");
  }
  if (
    isRecord(lastSafeSpawn) &&
    typeof lastSafeSpawn.zoneId === "string" &&
    !zoneById.has(lastSafeSpawn.zoneId as never)
  ) {
    return discarded(manifest, "removed_zone");
  }

  const parsed = spatialSessionEnvelopeSchema.safeParse(candidate);
  if (!parsed.success) return discarded(manifest, "invalid_envelope");

  const spawnZone = zoneById.get(parsed.data.lastSafeSpawn.zoneId);
  if (
    !spawnZone?.safeSpawns.some(
      (spawn) => spawn.spawnId === parsed.data.lastSafeSpawn.spawnId,
    )
  ) {
    return discarded(manifest, "removed_spawn");
  }

  return { session: parsed.data, discarded: false };
}
