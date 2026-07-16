import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import {
  loadVarennesReconstruction,
  validateReconstructionReferences,
} from "@/lib/case-engine/load-reconstruction";

const casePackage = loadVarennesCase();

describe("Varennes reconstruction companion", () => {
  it("loads an ordered, source-linked repair sequence for the current case version", () => {
    const reconstruction = loadVarennesReconstruction();

    expect(reconstruction.version).toBe("1.1.0");
    expect(reconstruction.caseId).toBe(casePackage.caseId);
    expect(reconstruction.caseVersion).toBe(casePackage.caseVersion);
    expect(reconstruction.repairSteps.map((step) => step.sequence)).toEqual([1, 2, 3, 4, 5, 6]);

    const nodeIds = new Set(casePackage.causalNodes.map((node) => node.id));
    const edgeIds = new Set(casePackage.causalEdges.map((edge) => edge.id));
    const sourceIds = new Set(casePackage.sources.map((source) => source.id));
    const evidenceIds = new Set(casePackage.evidence.map((evidence) => evidence.id));
    for (const step of reconstruction.repairSteps) {
      expect(step.nodeIds.every((nodeId) => nodeIds.has(nodeId))).toBe(true);
      expect(step.edgeIds.every((edgeId) => edgeIds.has(edgeId))).toBe(true);
      expect(step.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true);
      expect(step.evidenceIds.every((evidenceId) => evidenceIds.has(evidenceId))).toBe(true);
    }
  });

  it("ends the fictional branch at an explicit unknowable boundary", () => {
    const reconstruction = loadVarennesReconstruction();

    expect(reconstruction.counterfactualBoundary.provenance).toBe(
      "fictional_counterfactual_boundary",
    );
    expect(reconstruction.counterfactualBoundary.label).toBe("UNKNOWN");
    expect(reconstruction.counterfactualBoundary.statement).toMatch(/does not establish/i);
  });

  it("keeps debrief claims package-backed and excludes armed-halt scoring", () => {
    const reconstruction = loadVarennesReconstruction();
    const serialized = JSON.stringify(reconstruction);

    expect(serialized).not.toMatch(/armed halt/i);
    expect(serialized).not.toMatch(/returning postilions/i);
    expect(serialized).not.toMatch(/also required local mobilization/i);
    expect(reconstruction.debrief.established.length).toBeGreaterThan(0);
    expect(
      reconstruction.debrief.established.every(
        (item) =>
          item.provenance === "historical_reconstruction" &&
          item.factIds.length > 0 &&
          item.limitations.length > 0,
      ),
    ).toBe(true);
    expect(reconstruction.debrief.claimLimits).toHaveLength(
      casePackage.solution.uncertaintyIds.length,
    );
  });

  it("rejects a reconstruction step whose cited edge does not terminate at that step", () => {
    const reconstruction = structuredClone(loadVarennesReconstruction());
    reconstruction.repairSteps[0].edgeIds = ["EDGE-ROUTE-PURSUIT"];

    expect(() => validateReconstructionReferences(reconstruction, casePackage)).toThrow(
      /edge direction/i,
    );
  });

  it("rejects individually valid citations that do not form a fact-evidence-source relationship", () => {
    const reconstruction = structuredClone(loadVarennesReconstruction());
    reconstruction.debrief.established[0].factIds = ["F-S1-002"];

    expect(() => validateReconstructionReferences(reconstruction, casePackage)).toThrow(
      /evidentiary relationship/i,
    );
  });
});
