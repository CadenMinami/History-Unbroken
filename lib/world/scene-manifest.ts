import rawAmbientLines from "@/data/cases/varennes/world/ambient-lines.json";
import rawSceneManifest from "@/data/cases/varennes/world/scene-manifest.json";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesReconstruction } from "@/lib/case-engine/load-reconstruction";
import { loadVarennesModelPolicy } from "@/lib/openai/load-model-policy";
import type { CasePackage } from "@/schemas/case-package";
import type { ModelPolicy } from "@/schemas/model-policy";
import type { Reconstruction } from "@/schemas/reconstruction";
import {
  type AmbientLines,
  ambientLinesSchema,
  type CanonicalTarget,
  type SceneManifest,
  sceneManifestSchema,
} from "@/schemas/world-manifest";

function assertKnownIds(
  kind: string,
  ids: readonly string[],
  knownIds: ReadonlySet<string>,
  ownerId: string,
): void {
  for (const id of ids) {
    if (!knownIds.has(id)) {
      throw new Error(`${ownerId} references unknown ${kind} ID ${id}.`);
    }
  }
}

function targetMatchesInteraction(
  target: CanonicalTarget,
  interactionType: SceneManifest["interactables"][number]["interactionType"],
): boolean {
  if (target.targetType === "evidence") return interactionType === "inspect_evidence";
  if (target.targetType === "station") return interactionType === "open_station";
  if (target.targetType === "repair_checkpoint") {
    return interactionType === "enter_repair_checkpoint";
  }
  return interactionType === `open_${target.surfaceId}`;
}

export function validateSceneManifestReferences(
  manifest: SceneManifest,
  ambientLines: AmbientLines,
  casePackage: CasePackage,
  modelPolicy: ModelPolicy,
  reconstruction: Reconstruction,
): void {
  if (
    manifest.caseId !== casePackage.caseId ||
    manifest.caseVersion !== casePackage.caseVersion
  ) {
    throw new Error("The scene manifest does not match the canonical case version.");
  }
  if (
    manifest.caseId !== modelPolicy.caseId ||
    manifest.caseVersion !== modelPolicy.caseVersion ||
    manifest.modelPolicyVersion !== modelPolicy.policyVersion
  ) {
    throw new Error("The scene manifest does not match the canonical model policy.");
  }
  if (
    manifest.caseId !== reconstruction.caseId ||
    manifest.caseVersion !== reconstruction.caseVersion
  ) {
    throw new Error("The scene manifest does not match the canonical reconstruction.");
  }
  if (
    ambientLines.sceneManifestVersion !== manifest.sceneManifestVersion ||
    ambientLines.caseId !== manifest.caseId ||
    ambientLines.caseVersion !== manifest.caseVersion
  ) {
    throw new Error("Ambient lines do not match the scene manifest and case version.");
  }

  const zoneById = new Map(manifest.zones.map((zone) => [zone.zoneId, zone]));
  const evidenceById = new Map(casePackage.evidence.map((item) => [item.id, item]));
  const evidenceIds = new Set(evidenceById.keys());
  const factIds = new Set(casePackage.facts.map((item) => item.id));
  const sourceIds = new Set(casePackage.sources.map((item) => item.id));
  const stationById = new Map(
    modelPolicy.stationPolicies.map((station) => [station.stationId, station]),
  );
  const checkpointById = new Map<
    string,
    Reconstruction["repairSteps"][number]
  >(
    reconstruction.repairSteps.map((checkpoint) => [checkpoint.id, checkpoint]),
  );

  const initialZone = zoneById.get(manifest.initialSpawn.zoneId);
  if (
    !initialZone ||
    !initialZone.safeSpawns.some(
      (spawn) => spawn.spawnId === manifest.initialSpawn.spawnId,
    )
  ) {
    throw new Error("The initial safe spawn does not exist in its declared zone.");
  }

  for (const interactable of manifest.interactables) {
    if (!zoneById.has(interactable.zoneId)) {
      throw new Error(
        `${interactable.interactableId} references unknown zone ID ${interactable.zoneId}.`,
      );
    }
    if (!targetMatchesInteraction(interactable.canonicalTarget, interactable.interactionType)) {
      throw new Error(
        `${interactable.interactableId} has an interaction type that does not match its canonical target.`,
      );
    }

    assertKnownIds(
      "evidence",
      [...interactable.evidenceIds, ...interactable.prerequisites.evidenceIds],
      evidenceIds,
      interactable.interactableId,
    );
    assertKnownIds("fact", interactable.factIds, factIds, interactable.interactableId);
    assertKnownIds("source", interactable.sourceIds, sourceIds, interactable.interactableId);

    for (const zoneId of interactable.prerequisites.discoveredZoneIds) {
      if (!zoneById.has(zoneId)) {
        throw new Error(
          `${interactable.interactableId} references unknown prerequisite zone ID ${zoneId}.`,
        );
      }
    }

    const relatedEvidence = interactable.evidenceIds.map((id) => evidenceById.get(id)!);
    const relatedFactIds = new Set(relatedEvidence.flatMap((evidence) => evidence.factIds));
    const relatedSourceIds = new Set(
      relatedEvidence.flatMap((evidence) => evidence.sourceIds),
    );
    if (
      interactable.factIds.some((id) => !relatedFactIds.has(id)) ||
      interactable.sourceIds.some((id) => !relatedSourceIds.has(id))
    ) {
      throw new Error(
        `${interactable.interactableId} has fact or source IDs outside its evidence relationship.`,
      );
    }

    const target = interactable.canonicalTarget;
    if (target.targetType === "evidence") {
      if (!evidenceIds.has(target.evidenceId)) {
        throw new Error(
          `${interactable.interactableId} references unknown evidence ID ${target.evidenceId}.`,
        );
      }
      if (!interactable.evidenceIds.includes(target.evidenceId)) {
        throw new Error(
          `${interactable.interactableId} target is outside its declared evidence relationship.`,
        );
      }
    }
    if (target.targetType === "station") {
      const station = stationById.get(target.stationId);
      if (!station) {
        throw new Error(
          `${interactable.interactableId} references unknown station ID ${target.stationId}.`,
        );
      }
      if (
        interactable.evidenceIds.some((id) => !station.allowedEvidenceIds.includes(id)) ||
        interactable.factIds.some((id) => !station.allowedFactIds.includes(id)) ||
        interactable.sourceIds.some((id) => !station.allowedSourceIds.includes(id))
      ) {
        throw new Error(
          `${interactable.interactableId} exceeds the canonical station policy allowlists.`,
        );
      }
    }
    if (target.targetType === "repair_checkpoint") {
      const checkpoint = checkpointById.get(target.repairCheckpointId);
      if (!checkpoint) {
        throw new Error(
          `${interactable.interactableId} references unknown repair checkpoint ID ${target.repairCheckpointId}.`,
        );
      }
      const checkpointEvidenceIds = new Set<string>(checkpoint.evidenceIds);
      const checkpointFactIds = new Set<string>(checkpoint.factIds);
      const checkpointSourceIds = new Set<string>(checkpoint.sourceIds);
      if (
        interactable.evidenceIds.some((id) => !checkpointEvidenceIds.has(id)) ||
        interactable.factIds.some((id) => !checkpointFactIds.has(id)) ||
        interactable.sourceIds.some((id) => !checkpointSourceIds.has(id))
      ) {
        throw new Error(
          `${interactable.interactableId} exceeds the canonical repair checkpoint references.`,
        );
      }
    }
  }

  const ambientById = new Map(
    ambientLines.lines.map((line) => [line.ambientLineId, line]),
  );
  const referencedAmbientIds = new Set<string>();
  for (const zone of manifest.zones) {
    for (const ambientLineId of zone.ambientLineIds) {
      const line = ambientById.get(ambientLineId);
      if (!line || line.zoneId !== zone.zoneId || referencedAmbientIds.has(ambientLineId)) {
        throw new Error(
          `Ambient line ${ambientLineId} is missing, assigned to another zone, or duplicated.`,
        );
      }
      referencedAmbientIds.add(ambientLineId);
    }
  }
  if (referencedAmbientIds.size !== ambientLines.lines.length) {
    throw new Error("Every ambient line must be referenced by exactly one scene zone.");
  }
}

export function loadVarennesAmbientLines(): AmbientLines {
  return ambientLinesSchema.parse(rawAmbientLines);
}

export function loadVarennesSceneManifest(): SceneManifest {
  const manifest = sceneManifestSchema.parse(rawSceneManifest);
  validateSceneManifestReferences(
    manifest,
    loadVarennesAmbientLines(),
    loadVarennesCase(),
    loadVarennesModelPolicy(),
    loadVarennesReconstruction(),
  );
  return manifest;
}
