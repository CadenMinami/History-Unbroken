import { describe, expect, it } from "vitest";

import { casePackageSchema } from "@/schemas/case-package";

const validFixture = {
  schemaVersion: "1.0.0",
  caseVersion: "1.0.0",
  caseId: "synthetic",
  title: "Synthetic integrity case",
  facts: [
    {
      id: "F-1",
      claim: "A reviewed fact.",
      verificationStatus: "verified",
      sourceIds: ["S-1"],
    },
  ],
  sources: [
    {
      id: "S-1",
      title: "Reviewed source",
      sourceType: "primary",
      verificationStatus: "verified",
      lineageId: "L-1",
      historicalLineageEligible: true,
      ledgerEntryId: "S1",
      citation: "Reviewed source, p. 1.",
      citationUrl: "https://example.com/source",
      limitations: "Synthetic fixture for validation only.",
    },
  ],
  evidence: [
    {
      id: "E-1",
      title: "Historical record",
      shortTitle: "Record",
      kind: "historical_evidence",
      sourceType: "primary",
      verificationStatus: "verified",
      epistemicClassification: "verified_record",
      provenance: "verified_historical_record",
      sourceIds: ["S-1"],
      dependencyLineageIds: ["L-1"],
      sourceLineageIds: ["L-1"],
      factIds: ["F-1"],
      studentExcerpt: "A reviewed excerpt.",
      description: "Synthetic test evidence.",
      countsAsHistoricalEvidence: true,
    },
  ],
  anomalies: ["A", "B", "C"].map((id) => ({
    id: `E6${id}`,
    title: `Echo ${id}`,
    summary: "A fictional candidate.",
    provenance: "fictional_temporal_anomaly",
    presentationWeight: 1,
  })),
  branchObservations: ["1", "2", "3"].map((id) => ({
    id: `FO${id}`,
    title: `Observation ${id}`,
    content: "Authored branch state.",
    provenance: "fictional_branch_observation",
    countsAsHistoricalEvidence: false,
  })),
  conditions: [
    {
      id: "COND-BG-001",
      category: "background",
      label: "Reviewed background",
      factIds: ["F-1"],
    },
    {
      id: "COND-CV-001",
      category: "civic",
      label: "Reviewed civic capacity",
      factIds: ["F-1"],
    },
  ],
  causalNodes: [
    { id: "NODE-1", category: "condition", label: "Condition", factIds: ["F-1"] },
    {
      id: "CONS-1",
      category: "consequence",
      label: "Limited consequence",
      factIds: ["F-1"],
    },
  ],
  causalEdges: [
    {
      id: "EDGE-1",
      fromNodeId: "NODE-1",
      toNodeId: "CONS-1",
      verb: "contributed_to",
      factIds: ["F-1"],
    },
  ],
  uncertainties: [
    {
      id: "UNC-1",
      label: "The record does not establish an inevitable downstream future.",
      authority: "claim_limit",
      factIds: ["F-1"],
    },
  ],
  comparisonFindings: [
    {
      id: "CMP-1",
      label: "Compare the record and the branch",
      requiredItemIds: ["E6A", "E-1", "FO1"],
      conclusion: "The candidate conflicts with the observed branch.",
      result: { action: "reject_anomaly", anomalyId: "E6A" },
    },
    {
      id: "CMP-2",
      label: "Support the active anomaly",
      requiredItemIds: ["E6B", "E-1", "FO2"],
      conclusion: "The route candidate fits the branch.",
      result: { action: "support_active_anomaly", anomalyId: "E6B" },
    },
    {
      id: "CMP-3",
      label: "Reject the authorization anomaly",
      requiredItemIds: ["E6C", "E-1", "FO3"],
      conclusion: "The authorization candidate conflicts with the branch.",
      result: { action: "reject_anomaly", anomalyId: "E6C" },
    },
  ],
  solution: {
    activeAnomalyId: "E6B",
    rejectedAnomalyIds: ["E6A", "E6C"],
    requiredCausalNodeIds: ["NODE-1"],
    requiredCausalEdgeIds: ["EDGE-1"],
    requiredComparisonIds: ["CMP-1", "CMP-2", "CMP-3"],
    requiredEvidenceGroups: [{ allOf: ["E-1"] }],
    minimumHistoricalLineages: 1,
    minimumConditions: 2,
    requiredConditionCategories: ["background"],
    requireOneConditionFrom: ["journey", "geographic", "civic"],
    limitedConsequenceIds: ["CONS-1"],
    uncertaintyIds: ["UNC-1"],
  },
  repairGates: [
    {
      id: "GATE-1",
      label: "Use reviewed evidence",
      authority: "traceability_only",
      requiredFactIds: ["F-1"],
      requiredEvidenceIds: ["E-1"],
    },
  ],
};

describe("historical integrity validation", () => {
  it("accepts a fully linked reviewed package", () => {
    expect(casePackageSchema.safeParse(validFixture).success).toBe(true);
  });

  it("rejects fictional branch observations counted as historical evidence", () => {
    const invalid = structuredClone(validFixture);
    invalid.branchObservations[0].countsAsHistoricalEvidence = true;

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects unresolved facts used by repair gates", () => {
    const invalid = structuredClone(validFixture);
    invalid.facts[0].verificationStatus = "partial";

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects unknown evidence and fact references", () => {
    const invalid = structuredClone(validFixture);
    invalid.repairGates[0].requiredFactIds = ["F-MISSING"];
    invalid.repairGates[0].requiredEvidenceIds = ["E-MISSING"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects anomaly presentation that visually privileges one candidate", () => {
    const invalid = structuredClone(validFixture);
    invalid.anomalies[1].presentationWeight = 2;

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects solution references outside the causal and uncertainty registries", () => {
    const invalid = structuredClone(validFixture);
    invalid.solution.limitedConsequenceIds = ["CONS-MISSING"];
    invalid.solution.uncertaintyIds = ["UNC-MISSING"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a solution that also lists the active anomaly as rejected", () => {
    const invalid = structuredClone(validFixture);
    invalid.solution.rejectedAnomalyIds = ["E6B", "E6C"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects evidence lineage IDs not supplied by its referenced sources", () => {
    const invalid = structuredClone(validFixture);
    invalid.evidence[0].sourceLineageIds = ["L-MISSING"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects verified evidence built on a fact that is still partial", () => {
    const invalid = structuredClone(validFixture);
    invalid.facts[0].verificationStatus = "partial";
    invalid.repairGates[0].requiredFactIds = [];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects comparison findings that reference an unknown item", () => {
    const invalid = structuredClone(validFixture);
    invalid.comparisonFindings[0].requiredItemIds = ["E-1", "ITEM-MISSING"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a solution without reachable findings for every anomaly decision", () => {
    const invalid = structuredClone(validFixture);
    invalid.solution.requiredComparisonIds = ["CMP-1"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a decision comparison without both branch and historical evidence", () => {
    const invalid = structuredClone(validFixture);
    invalid.comparisonFindings[0].requiredItemIds = ["E6A", "FO1"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects historical evidence with a fictional source type", () => {
    const invalid = structuredClone(validFixture);
    invalid.evidence[0].sourceType = "fiction";

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a historical fact backed by a fictional source", () => {
    const invalid = structuredClone(validFixture);
    invalid.sources[0].sourceType = "fiction";

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects incompatible historical evidence metadata", () => {
    const invalid = structuredClone(validFixture);
    invalid.evidence[0].epistemicClassification = "reconstruction";
    invalid.evidence[0].provenance = "historical_reconstruction";

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it.each([
    ["fictional_counterfactual", "fictional_temporal_anomaly"],
    ["dramatization", "dramatized_dialogue"],
    ["class_material", "class_material"],
  ])(
    "rejects %s content promoted into historical evidence",
    (epistemicClassification, provenance) => {
      const invalid = structuredClone(validFixture);
      invalid.evidence[0].epistemicClassification = epistemicClassification;
      invalid.evidence[0].provenance = provenance;

      expect(casePackageSchema.safeParse(invalid).success).toBe(false);
    },
  );

  it("rejects historical evidence supplied by an unresolved source", () => {
    const invalid = structuredClone(validFixture);
    invalid.sources[0].verificationStatus = "partial";

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects unresolved facts used only by a condition or causal edge", () => {
    const invalid = structuredClone(validFixture);
    invalid.facts.push({
      id: "F-2",
      claim: "An unresolved fact.",
      verificationStatus: "partial",
      sourceIds: ["S-1"],
    });
    invalid.conditions[1].factIds = ["F-2"];
    invalid.causalEdges[0].factIds = ["F-2"];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects duplicate IDs within or across comparable registries", () => {
    const invalid = structuredClone(validFixture);
    invalid.evidence.push({ ...invalid.evidence[0] });

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects required comparison effects that contradict the solution", () => {
    const invalid = structuredClone(validFixture);
    invalid.comparisonFindings[0].result = {
      action: "support_active_anomaly",
      anomalyId: "E6A",
    };

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects incomplete independent-lineage declarations", () => {
    const invalid = structuredClone(validFixture);
    invalid.evidence[0].sourceLineageIds = [];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects impossible solution minima and empty traceability gates", () => {
    const invalid = structuredClone(validFixture);
    invalid.solution.minimumConditions = 99;
    invalid.repairGates[0].requiredFactIds = [];
    invalid.repairGates[0].requiredEvidenceIds = [];

    expect(casePackageSchema.safeParse(invalid).success).toBe(false);
  });
});
