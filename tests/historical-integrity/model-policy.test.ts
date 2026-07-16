import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesModelPolicy } from "@/lib/openai/load-model-policy";

const casePackage = loadVarennesCase();
const policy = loadVarennesModelPolicy();
const factsById = new Map(casePackage.facts.map((fact) => [fact.id, fact]));
const sourcesById = new Map(casePackage.sources.map((source) => [source.id, source]));
const evidenceById = new Map(casePackage.evidence.map((evidence) => [evidence.id, evidence]));
const stationsById = new Map(
  policy.stationPolicies.map((station) => [station.stationId, station]),
);

describe("model-policy historical integrity", () => {
  it("limits each station to the approved canon slice", () => {
    expect(stationsById.get("CHAR-DROUET")?.allowedFactIds).toEqual([
      "F-S2-001",
      "F-S2-002",
      "F-S2-003",
      "F-S2-004",
      "F-S2-005",
      "F-S2-006",
      "F-S3-003",
      "F-S4-004",
    ]);
    expect(stationsById.get("CHAR-LOUIS")?.allowedFactIds).toEqual([
      "F-S1-002",
      "F-S1-004",
    ]);
    expect(stationsById.get("STATION-VARENNES-CIVIC")?.allowedFactIds).toEqual([
      "F-S3-002",
      "F-S3-003",
      "F-S3-005",
    ]);
    expect(stationsById.get("STATION-ASSEMBLY")?.allowedFactIds).toEqual([
      "F-S5-001",
      "F-S5-003",
      "F-S5-004A",
      "F-S5-005",
    ]);
  });

  it("allows generated stations to reference only verified case facts, sources, and evidence", () => {
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      for (const factId of station.allowedFactIds) {
        expect(factsById.get(factId)?.verificationStatus).toBe("verified");
      }
      for (const sourceId of station.allowedSourceIds) {
        expect(sourcesById.get(sourceId)?.verificationStatus).toBe("verified");
      }
      for (const evidenceId of station.allowedEvidenceIds) {
        expect(evidenceById.has(evidenceId)).toBe(true);
      }
    }
  });

  it("traces every authored unit that uses historical facts to verified sources", () => {
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      const historicalUnits = [
        ...station.claimUnits,
        ...station.evidenceReactionUnits,
      ].filter((unit) => unit.factIds.length > 0);

      for (const unit of historicalUnits) {
        expect(unit.sourceIds.length).toBeGreaterThan(0);

        for (const factId of unit.factIds) {
          const fact = factsById.get(factId);
          expect(fact?.verificationStatus).toBe("verified");
          expect(station.allowedFactIds).toContain(factId);
          expect(fact?.sourceIds.some((sourceId) => unit.sourceIds.includes(sourceId))).toBe(
            true,
          );
        }
        for (const sourceId of unit.sourceIds) {
          expect(sourcesById.get(sourceId)?.verificationStatus).toBe("verified");
          expect(station.allowedSourceIds).toContain(sourceId);
          expect(
            unit.factIds.some((factId) => factsById.get(factId)?.sourceIds.includes(sourceId)),
          ).toBe(true);
        }
      }
    }
  });

  it("requires every authored evidence prerequisite to exist and be station-allowed", () => {
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      const prerequisites = [
        ...station.claimUnits.flatMap((unit) => unit.requiresPresentedEvidenceIds),
        ...station.evidenceReactionUnits.flatMap(
          (unit) => unit.requiresPresentedEvidenceIds,
        ),
      ];

      for (const evidenceId of prerequisites) {
        expect(evidenceById.has(evidenceId)).toBe(true);
        expect(station.allowedEvidenceIds).toContain(evidenceId);
      }
    }
  });

  it("keeps each evidence reaction inside the fact and source closure of its presented records", () => {
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      for (const unit of station.evidenceReactionUnits) {
        const prerequisites = unit.requiresPresentedEvidenceIds.map((evidenceId) => {
          const evidence = evidenceById.get(evidenceId);
          if (!evidence) throw new Error(`Missing evidence prerequisite ${evidenceId}.`);
          return evidence;
        });
        const permittedFactIds = new Set(
          prerequisites.flatMap((evidence) => evidence.factIds),
        );
        const permittedSourceIds = new Set(
          prerequisites.flatMap((evidence) => evidence.sourceIds),
        );

        expect(unit.factIds.every((factId) => permittedFactIds.has(factId))).toBe(true);
        expect(unit.sourceIds.every((sourceId) => permittedSourceIds.has(sourceId))).toBe(
          true,
        );
      }
    }
  });

  it("keeps Drouet's branch memory fictional and historical facts in attributed evidence reactions", () => {
    const drouet = stationsById.get("CHAR-DROUET");
    if (!drouet || drouet.mode !== "generated_dialogue") {
      throw new Error("Missing generated Drouet policy.");
    }

    for (const unit of drouet.claimUnits) {
      expect(unit.epistemicClassification).toBe("fictional_counterfactual");
      expect(unit.provenance).toBe("fictional_branch_observation");
      expect(unit.countsAsHistoricalEvidence).toBe(false);
      expect(unit.branchObservationIds).toEqual(["FO1"]);
      expect(unit.factIds).toEqual([]);
      expect(unit.sourceIds).toEqual([]);
    }

    const reactionsWithHistory = drouet.evidenceReactionUnits.filter(
      (unit) => unit.factIds.length > 0,
    );
    expect(reactionsWithHistory.length).toBeGreaterThan(0);
    for (const unit of reactionsWithHistory) {
      expect(unit.text.standard.toLowerCase()).toContain("report");
      expect(unit.text.reduced.toLowerCase()).toContain("report");
      expect(unit.text.standard.toLowerCase()).toMatch(/said|says|reported|describes|draws on/);
      expect(unit.text.standard.toLowerCase()).toContain("fictional branch");
      expect(unit.text.standard.toLowerCase()).not.toContain("all mattered");
      expect(unit.text.standard.toLowerCase()).not.toMatch(
        /verified historical reports? (says?|shows?)/,
      );
      expect(unit.requiresPresentedEvidenceIds.length).toBeGreaterThan(0);
    }
    expect(drouet.explicitUnknowns).toContainEqual(
      expect.objectContaining({ unknownId: "UNKNOWN-DROUET-CLERMONT-INFORMANT" }),
    );

    const drouetPublicText = JSON.stringify({
      claimUnits: drouet.claimUnits,
      evidenceReactionUnits: drouet.evidenceReactionUnits,
      followUpQuestionUnits: drouet.followUpQuestionUnits,
      refusalUnknownUnits: drouet.refusalUnknownUnits,
    }).toLowerCase();
    expect(drouetPublicText).not.toMatch(/postmaster|clermont innkeeper|named informant/);
  });

  it("cross-validates fictional branch units without promoting them to historical evidence", () => {
    const branchObservations = new Map<
      string,
      (typeof casePackage.branchObservations)[number]
    >(
      casePackage.branchObservations.map((observation) => [observation.id, observation]),
    );
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      for (const unit of [...station.claimUnits, ...station.evidenceReactionUnits]) {
        expect(unit.countsAsHistoricalEvidence).toBe(false);
        for (const branchObservationId of unit.branchObservationIds) {
          const observation = branchObservations.get(branchObservationId);
          expect(observation?.provenance).toBe("fictional_branch_observation");
          expect(observation?.countsAsHistoricalEvidence).toBe(false);
        }
        if (unit.epistemicClassification === "fictional_counterfactual") {
          expect(unit.provenance).toBe("fictional_branch_observation");
          expect(unit.branchObservationIds.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps Louis's complete private motive explicitly unresolved", () => {
    const louis = stationsById.get("CHAR-LOUIS");
    if (!louis || louis.mode !== "generated_dialogue") {
      throw new Error("Missing generated Louis policy.");
    }

    expect(louis.explicitUnknowns).toContainEqual(
      expect.objectContaining({ unknownId: "UNKNOWN-LOUIS-COMPLETE-PRIVATE-MOTIVE" }),
    );
    expect(JSON.stringify(louis.responseBoundaries).toLowerCase()).toContain(
      "complete private motive",
    );
    expect(louis.allowedEvidenceIds).toEqual(["E1"]);
    expect(JSON.stringify(louis)).not.toMatch(/E2|S8|S9|preparation records/i);
  });

  it("excludes Barnave, S6, anomaly IDs, and unrelated branch observations", () => {
    const generatedKnowledge = JSON.stringify(
      policy.stationPolicies.filter((station) => station.mode === "generated_dialogue"),
    );

    expect(generatedKnowledge).not.toMatch(/Barnave/i);
    expect(generatedKnowledge).not.toMatch(/F-S6-|"S6(?:-|\")/);
    expect(generatedKnowledge).not.toMatch(/E6[ABC]/);
    expect(generatedKnowledge).toContain("FO1");
    expect(generatedKnowledge).not.toMatch(/FO[23]/);
  });

  it("keeps every recordable claim allowlist empty for the MVP", () => {
    for (const station of policy.stationPolicies) {
      expect(station.recordableClaimIds).toEqual([]);
    }
  });
});
