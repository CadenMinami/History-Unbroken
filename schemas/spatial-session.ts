import { z } from "zod";

import { SCENE_MANIFEST_VERSION, worldZoneIdSchema } from "./world-manifest";

export const SPATIAL_SESSION_VERSION = "1.0.0" as const;

export const investigationModeSchema = z.enum(["spatial", "non_spatial"]);
export const guidanceSettingSchema = z.enum(["off", "subtle", "guided"]);
export const graphicsTierSchema = z.enum(["high", "balanced", "classroom"]);

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

export const safeSpawnReferenceSchema = z
  .object({
    zoneId: worldZoneIdSchema,
    spawnId: z.string().min(1).max(100),
  })
  .strict();

export const spatialSessionEnvelopeSchema = z
  .object({
    spatialSessionVersion: z.literal(SPATIAL_SESSION_VERSION),
    caseId: z.string().min(1).max(100),
    caseVersion: semverSchema,
    sceneManifestVersion: z.literal(SCENE_MANIFEST_VERSION),
    mode: investigationModeSchema,
    lastSafeSpawn: safeSpawnReferenceSchema,
    discoveredZoneIds: z.array(worldZoneIdSchema),
    guidanceSetting: guidanceSettingSchema,
    graphicsTier: graphicsTierSchema,
  })
  .strict()
  .superRefine((session, context) => {
    if (new Set(session.discoveredZoneIds).size !== session.discoveredZoneIds.length) {
      context.addIssue({
        code: "custom",
        path: ["discoveredZoneIds"],
        message: "Discovered zone IDs must be unique.",
      });
    }
    if (!session.discoveredZoneIds.includes(session.lastSafeSpawn.zoneId)) {
      context.addIssue({
        code: "custom",
        path: ["lastSafeSpawn", "zoneId"],
        message: "The last safe spawn must be inside a discovered zone.",
      });
    }
  });

export type SpatialSessionEnvelope = z.infer<typeof spatialSessionEnvelopeSchema>;
export type InvestigationMode = z.infer<typeof investigationModeSchema>;
