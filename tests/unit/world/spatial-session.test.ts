import { describe, expect, it } from "vitest";

import {
  canFastTravelToZone,
  createInitialSpatialSession,
  recordZoneVisit,
  requestFastTravel,
  resolveAuthoredSafeSpawn,
  restoreSpatialSession,
  serializeSpatialSession,
  updateGuidanceSetting,
} from "@/lib/world/spatial-session";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import { spatialSessionEnvelopeSchema } from "@/schemas/spatial-session";

const manifest = loadVarennesSceneManifest();

function currentSession() {
  const initial = createInitialSpatialSession(manifest);
  return {
    ...initial,
    lastSafeSpawn: {
      zoneId: "post-road-square" as const,
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    },
    discoveredZoneIds: [
      "archive-antechamber" as const,
      "post-road-square" as const,
    ],
    guidanceSetting: "guided" as const,
    graphicsTier: "classroom" as const,
  };
}

describe("spatial session persistence", () => {
  it("round-trips only the separately versioned spatial fields", () => {
    const session = currentSession();
    const restored = restoreSpatialSession(manifest, serializeSpatialSession(session));

    expect(restored).toEqual({ session, discarded: false });
    expect(Object.keys(session).sort()).toEqual([
      "caseId",
      "caseVersion",
      "discoveredZoneIds",
      "graphicsTier",
      "guidanceSetting",
      "lastSafeSpawn",
      "mode",
      "sceneManifestVersion",
      "spatialSessionVersion",
    ]);
  });

  it("rejects extra persisted case progress", () => {
    const invalid = {
      ...currentSession(),
      pinnedEvidenceIds: ["E3"],
    };

    expect(spatialSessionEnvelopeSchema.safeParse(invalid).success).toBe(false);
  });

  it.each([
    ["spatial session", "spatialSessionVersion", "0.9.0", "session_version_mismatch"],
    ["case ID", "caseId", "another-case", "case_mismatch"],
    ["case version", "caseVersion", "0.9.0", "case_mismatch"],
    [
      "scene manifest",
      "sceneManifestVersion",
      "0.9.0",
      "scene_manifest_version_mismatch",
    ],
  ] as const)("discards a %s mismatch", (_label, field, value, reason) => {
    const serialized = JSON.stringify({ ...currentSession(), [field]: value });

    const result = restoreSpatialSession(manifest, serialized);

    expect(result.discarded).toBe(true);
    if (!result.discarded) throw new Error("Expected stale spatial state to be discarded.");
    expect(result.reason).toBe(reason);
    expect(result.session).toEqual(createInitialSpatialSession(manifest));
  });

  it("discards removed zone and spawn references independently", () => {
    const removedZone = {
      ...currentSession(),
      discoveredZoneIds: ["archive-antechamber", "removed-zone"],
    };
    expect(restoreSpatialSession(manifest, JSON.stringify(removedZone))).toMatchObject({
      discarded: true,
      reason: "removed_zone",
    });

    const removedSpawn = {
      ...currentSession(),
      lastSafeSpawn: {
        zoneId: "archive-antechamber",
        spawnId: "SPAWN-REMOVED",
      },
    };
    expect(restoreSpatialSession(manifest, JSON.stringify(removedSpawn))).toMatchObject({
      discarded: true,
      reason: "removed_spawn",
    });
  });

});

describe("spatial session transitions", () => {
  it("leaves adjacent educational state unchanged during a spatial transition", () => {
    const educationalState = {
      revision: 7,
      pinnedEvidenceIds: ["E3"],
    };
    const applicationState = {
      educationalState,
      spatialSession: createInitialSpatialSession(manifest),
    };
    const educationalStateBefore = structuredClone(applicationState.educationalState);

    const visit = recordZoneVisit(manifest, applicationState.spatialSession, {
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
    if (!visit.accepted) throw new Error("Expected the visit to be accepted.");
    const transitionedApplicationState = {
      ...applicationState,
      spatialSession: visit.session,
    };

    expect(transitionedApplicationState.spatialSession).not.toBe(
      applicationState.spatialSession,
    );
    expect(transitionedApplicationState.educationalState).toBe(educationalState);
    expect(transitionedApplicationState.educationalState).toEqual(
      educationalStateBefore,
    );
  });

  it("records a manifest-backed zone visit once and updates the last safe spawn", () => {
    const initial = createInitialSpatialSession(manifest);
    const initialBefore = structuredClone(initial);
    const destination = {
      zoneId: "post-road-square" as const,
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    };

    const firstVisit = recordZoneVisit(manifest, initial, destination);

    expect(firstVisit.accepted).toBe(true);
    if (!firstVisit.accepted) throw new Error("Expected the visit to be accepted.");
    expect(firstVisit.session.discoveredZoneIds).toEqual([
      "archive-antechamber",
      "post-road-square",
    ]);
    expect(firstVisit.session.lastSafeSpawn).toEqual(destination);
    expect(firstVisit.safeSpawn).toEqual({
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
      label: "Post-road entry",
      position: [24, 0, 0],
      yaw: 0,
    });
    expect(initial).toEqual(initialBefore);

    const repeatedVisit = recordZoneVisit(
      manifest,
      firstVisit.session,
      destination,
    );

    expect(repeatedVisit.accepted).toBe(true);
    if (!repeatedVisit.accepted) {
      throw new Error("Expected the repeated visit to be accepted.");
    }
    expect(repeatedVisit.session.discoveredZoneIds).toEqual([
      "archive-antechamber",
      "post-road-square",
    ]);
  });

  it("updates guidance without changing location or discovery state", () => {
    const session = currentSession();
    const before = structuredClone(session);

    const updated = updateGuidanceSetting(session, "off");

    expect(updated.guidanceSetting).toBe("off");
    expect(updated.lastSafeSpawn).toEqual(before.lastSafeSpawn);
    expect(updated.discoveredZoneIds).toEqual(before.discoveredZoneIds);
    expect(session).toEqual(before);
  });

  it("rejects visits unless both the zone and safe spawn are authored", () => {
    const initial = createInitialSpatialSession(manifest);
    const before = structuredClone(initial);

    expect(
      recordZoneVisit(manifest, initial, {
        zoneId: "removed-zone" as never,
        spawnId: "SPAWN-POST-ROAD-ENTRY",
      }),
    ).toEqual({ accepted: false, session: initial, reason: "unknown_zone" });
    expect(
      recordZoneVisit(manifest, initial, {
        zoneId: "post-road-square",
        spawnId: "SPAWN-REMOVED",
      }),
    ).toEqual({ accepted: false, session: initial, reason: "unknown_spawn" });
    expect(initial).toEqual(before);
  });

  it("authorizes fast travel only for discovered zones enabled by the manifest", () => {
    const initial = createInitialSpatialSession(manifest);
    expect(canFastTravelToZone(manifest, initial, "post-road-square")).toBe(false);
    expect(canFastTravelToZone(manifest, initial, "archive-antechamber")).toBe(
      false,
    );

    const visit = recordZoneVisit(manifest, initial, {
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
    if (!visit.accepted) throw new Error("Expected the visit to be accepted.");

    expect(canFastTravelToZone(manifest, visit.session, "post-road-square")).toBe(
      true,
    );
  });

  it("returns only manifest-authored coordinates for an accepted fast travel request", () => {
    const initial = createInitialSpatialSession(manifest);
    const visit = recordZoneVisit(manifest, initial, {
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
    if (!visit.accepted) throw new Error("Expected the visit to be accepted.");
    const destinationWithUntrustedCoordinates = {
      zoneId: "post-road-square" as const,
      spawnId: "SPAWN-POST-ROAD-ENTRY",
      position: [999, 999, 999] as const,
      yaw: 999,
    };

    expect(
      resolveAuthoredSafeSpawn(manifest, destinationWithUntrustedCoordinates),
    ).toEqual({
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
      label: "Post-road entry",
      position: [24, 0, 0],
      yaw: 0,
    });

    const travel = requestFastTravel(
      manifest,
      visit.session,
      destinationWithUntrustedCoordinates,
    );

    expect(travel.accepted).toBe(true);
    if (!travel.accepted) throw new Error("Expected fast travel to be accepted.");
    expect(travel.session.lastSafeSpawn).toEqual({
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
    expect(travel.safeSpawn.position).toEqual([24, 0, 0]);
    expect(travel.safeSpawn.yaw).toBe(0);
  });

  it("returns authored safe-spawn positions detached from manifest data", () => {
    const isolatedManifest = loadVarennesSceneManifest();
    const authoredSpawn = isolatedManifest.zones
      .find((zone) => zone.zoneId === "post-road-square")
      ?.safeSpawns.find((spawn) => spawn.spawnId === "SPAWN-POST-ROAD-ENTRY");
    if (!authoredSpawn) throw new Error("Expected the authored spawn fixture.");

    const resolved = resolveAuthoredSafeSpawn(isolatedManifest, {
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });
    if (!resolved) throw new Error("Expected the authored spawn to resolve.");

    resolved.position[0] = 999;

    expect(resolved.position).not.toBe(authoredSpawn.position);
    expect(authoredSpawn.position).toEqual([24, 0, 0]);
    expect(
      resolveAuthoredSafeSpawn(isolatedManifest, {
        zoneId: "post-road-square",
        spawnId: "SPAWN-POST-ROAD-ENTRY",
      })?.position,
    ).toEqual([24, 0, 0]);
  });

  it("rejects unauthorized fast travel without mutating the input session", () => {
    const initial = createInitialSpatialSession(manifest);
    const before = structuredClone(initial);

    expect(
      requestFastTravel(manifest, initial, {
        zoneId: "post-road-square",
        spawnId: "SPAWN-POST-ROAD-ENTRY",
      }),
    ).toEqual({
      accepted: false,
      session: initial,
      reason: "zone_not_discovered",
    });
    expect(
      requestFastTravel(manifest, initial, {
        zoneId: "archive-antechamber",
        spawnId: "SPAWN-ARCHIVE-ENTRY",
      }),
    ).toEqual({
      accepted: false,
      session: initial,
      reason: "fast_travel_locked",
    });
    expect(initial).toEqual(before);
  });
});
