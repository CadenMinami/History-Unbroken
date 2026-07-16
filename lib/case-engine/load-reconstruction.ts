import reconstructionData from "@/data/cases/varennes/reconstruction.json";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import {
  type Reconstruction,
  reconstructionSchema,
} from "@/schemas/reconstruction";
import type { CasePackage } from "@/schemas/case-package";

export function validateReconstructionReferences(
  reconstruction: Reconstruction,
  casePackage: CasePackage,
): void {
  if (
    reconstruction.caseId !== casePackage.caseId ||
    reconstruction.caseVersion !== casePackage.caseVersion
  ) {
    throw new Error("Reconstruction companion does not match the active case version.");
  }

  const nodeIds = new Set(casePackage.causalNodes.map((node) => node.id));
  const edgeById = new Map(casePackage.causalEdges.map((edge) => [edge.id, edge]));
  const factById = new Map(casePackage.facts.map((fact) => [fact.id, fact]));
  const evidenceById = new Map(casePackage.evidence.map((evidence) => [evidence.id, evidence]));
  const factIds = new Set(factById.keys());
  const evidenceIds = new Set(evidenceById.keys());
  const sourceIds = new Set(casePackage.sources.map((source) => source.id));
  const uncertaintyIds = new Set(casePackage.uncertainties.map((item) => item.id));

  for (const step of reconstruction.repairSteps) {
    if (
      !step.nodeIds.every((id) => nodeIds.has(id)) ||
      !step.edgeIds.every((id) => edgeById.has(id)) ||
      !step.factIds.every((id) => factIds.has(id)) ||
      !step.evidenceIds.every((id) => evidenceIds.has(id)) ||
      !step.sourceIds.every((id) => sourceIds.has(id))
    ) {
      throw new Error(`Repair step ${step.id} contains a reference outside the case package.`);
    }
    if (
      !step.edgeIds.every((edgeId) =>
        step.nodeIds.includes(edgeById.get(edgeId)!.toNodeId),
      )
    ) {
      throw new Error(`Repair step ${step.id} has an edge direction that does not terminate at its restored node.`);
    }
  }

  for (const item of [
    ...reconstruction.repairSteps,
    ...reconstruction.politicalMeaning,
    ...reconstruction.debrief.established,
  ]) {
    if (
      !item.evidenceIds.every((id) => evidenceIds.has(id)) ||
      !item.sourceIds.every((id) => sourceIds.has(id)) ||
      !item.factIds.every((id) => factIds.has(id))
    ) {
      throw new Error(`Reconstruction item ${item.id} contains an unknown source reference.`);
    }

    const factHasSupport = (factId: string) => {
      const fact = factById.get(factId)!;
      return item.evidenceIds.some((evidenceId) => {
        const evidence = evidenceById.get(evidenceId)!;
        return (
          evidence.factIds.includes(factId) &&
          evidence.sourceIds.some(
            (sourceId) => item.sourceIds.includes(sourceId) && fact.sourceIds.includes(sourceId),
          )
        );
      });
    };
    const evidenceHasSupport = (evidenceId: string) => {
      const evidence = evidenceById.get(evidenceId)!;
      return item.factIds.some(
        (factId) =>
          evidence.factIds.includes(factId) &&
          evidence.sourceIds.some(
            (sourceId) =>
              item.sourceIds.includes(sourceId) &&
              factById.get(factId)!.sourceIds.includes(sourceId),
          ),
      );
    };
    const sourceHasSupport = (sourceId: string) =>
      item.factIds.some(
        (factId) =>
          factById.get(factId)!.sourceIds.includes(sourceId) &&
          item.evidenceIds.some((evidenceId) => {
            const evidence = evidenceById.get(evidenceId)!;
            return evidence.factIds.includes(factId) && evidence.sourceIds.includes(sourceId);
          }),
      );

    if (
      !item.factIds.every(factHasSupport) ||
      !item.evidenceIds.every(evidenceHasSupport) ||
      !item.sourceIds.every(sourceHasSupport)
    ) {
      throw new Error(
        `Reconstruction item ${item.id} does not form a valid fact-evidence-source evidentiary relationship.`,
      );
    }
  }
  if (
    !reconstruction.debrief.claimLimits.every((item) =>
      uncertaintyIds.has(item.uncertaintyId),
    )
  ) {
    throw new Error("Debrief claim limits must reference authored case uncertainties.");
  }
}

export function loadVarennesReconstruction(): Reconstruction {
  const reconstruction = reconstructionSchema.parse(reconstructionData);
  const casePackage = loadVarennesCase();
  validateReconstructionReferences(reconstruction, casePackage);

  return reconstruction;
}
