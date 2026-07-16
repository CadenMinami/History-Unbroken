import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";

describe("Varennes case package", () => {
  it("loads a versioned package with three equally presented anomaly candidates", () => {
    const casePackage = loadVarennesCase();

    expect(casePackage.schemaVersion).toBe("1.0.0");
    expect(casePackage.caseVersion).toBe("1.0.3");
    expect(casePackage.caseId).toBe("varennes");
    expect(casePackage.anomalies).toHaveLength(3);
    expect(new Set(casePackage.anomalies.map((item) => item.presentationWeight))).toEqual(
      new Set([1]),
    );
    expect(new Set(casePackage.anomalies.map((item) => item.provenance))).toEqual(
      new Set(["fictional_temporal_anomaly"]),
    );
  });

  it("keeps blocked onward passage distinct from unsupported armed-halt scoring", () => {
    const casePackage = loadVarennesCase();

    expect(casePackage.causalNodes.some((node) => node.label === "Blocked onward passage")).toBe(
      true,
    );
    expect(casePackage.causalNodes.some((node) => /armed halt/i.test(node.label))).toBe(false);
  });

  it("keeps fictional branch observations outside historical evidence", () => {
    const casePackage = loadVarennesCase();

    expect(casePackage.branchObservations.map((item) => item.id)).toEqual([
      "FO1",
      "FO2",
      "FO3",
    ]);
    expect(casePackage.branchObservations.every((item) => !item.countsAsHistoricalEvidence)).toBe(
      true,
    );
    expect(
      casePackage.branchObservations.every(
        (item) => item.provenance === "fictional_branch_observation",
      ),
    ).toBe(true);
  });

  it("gives each historical evidence item a source lineage", () => {
    const casePackage = loadVarennesCase();
    const historicalEvidence = casePackage.evidence.filter(
      (item) => item.kind === "historical_evidence",
    );

    expect(historicalEvidence.length).toBeGreaterThanOrEqual(6);
    expect(historicalEvidence.every((item) => item.sourceLineageIds.length > 0)).toBe(true);
  });

  it("keeps the proclamation and September Constitution on atomic source records", () => {
    const casePackage = loadVarennesCase();
    const proclamationFact = casePackage.facts.find((item) => item.id === "F-S5-001");
    const constitutionFact = casePackage.facts.find((item) => item.id === "F-S5-005");
    const constitutionSource = casePackage.sources.find(
      (item) => item.id === "S5-CONSTITUTION",
    );

    expect(proclamationFact?.sourceIds).toEqual(["S5-PROCLAMATION"]);
    expect(constitutionFact?.sourceIds).toEqual(["S5-CONSTITUTION"]);
    expect(constitutionSource?.citationUrl).toContain("elysee.fr");
  });
});
