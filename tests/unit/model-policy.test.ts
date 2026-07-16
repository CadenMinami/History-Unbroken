import { describe, expect, it } from "vitest";

import {
  getGeneratedStationPolicy,
  loadVarennesModelPolicy,
} from "@/lib/openai/load-model-policy";
import { modelPolicySchema } from "@/schemas/model-policy";

const policy = loadVarennesModelPolicy();

describe("Varennes model policy", () => {
  it("is versioned against the frozen Varennes case", () => {
    expect(policy).toMatchObject({
      schemaVersion: "1.0.0",
      policyVersion: "1.0.1",
      caseId: "varennes",
      caseVersion: "1.0.3",
    });
  });

  it("authorizes only Drouet and Louis for generated dialogue", () => {
    expect(
      policy.stationPolicies.map(({ stationId, mode }) => ({ stationId, mode })),
    ).toEqual([
      { stationId: "CHAR-DROUET", mode: "generated_dialogue" },
      { stationId: "CHAR-LOUIS", mode: "generated_dialogue" },
      { stationId: "STATION-VARENNES-CIVIC", mode: "static_dossier" },
      { stationId: "STATION-ASSEMBLY", mode: "static_dossier" },
    ]);

    expect(getGeneratedStationPolicy("CHAR-DROUET").stationId).toBe("CHAR-DROUET");
    expect(() => getGeneratedStationPolicy("STATION-VARENNES-CIVIC")).toThrow(
      /not authorized for generated dialogue/i,
    );
    expect(() => getGeneratedStationPolicy("STATION-ASSEMBLY")).toThrow(
      /not authorized for generated dialogue/i,
    );
  });

  it("keeps every generated fallback turn inside the authored unit registry", () => {
    const generatedStations = policy.stationPolicies.filter(
      (station) => station.mode === "generated_dialogue",
    );

    for (const station of generatedStations) {
      const claimUnitIds = new Set(station.claimUnits.map((unit) => unit.claimId));
      const reactionUnitIds = new Set(
        station.evidenceReactionUnits.map((unit) => unit.evidenceReactionUnitId),
      );
      const followUpUnitIds = new Set(
        station.followUpQuestionUnits.map((unit) => unit.followUpQuestionUnitId),
      );
      const refusalUnitIds = new Set(
        station.refusalUnknownUnits.map((unit) => unit.refusalUnitId),
      );

      expect(station.fallbackTurns.length).toBeGreaterThan(0);
      for (const fallback of station.fallbackTurns) {
        expect(fallback.claimUnitIds.every((id) => claimUnitIds.has(id))).toBe(true);
        expect(
          fallback.evidenceReactionUnitId === null ||
            reactionUnitIds.has(fallback.evidenceReactionUnitId),
        ).toBe(true);
        expect(
          fallback.followUpQuestionUnitId === null ||
            followUpUnitIds.has(fallback.followUpQuestionUnitId),
        ).toBe(true);
        expect(
          fallback.refusalUnitId === null || refusalUnitIds.has(fallback.refusalUnitId),
        ).toBe(true);
        expect(Object.keys(fallback).sort()).toEqual([
          "claimUnitIds",
          "evidenceReactionUnitId",
          "fallbackTurnId",
          "followUpQuestionUnitId",
          "refusalUnitId",
        ]);
      }
    }
  });

  it("rejects free prose added to a fallback turn", () => {
    const invalid = structuredClone(policy);
    const drouet = invalid.stationPolicies.find(
      (station) => station.stationId === "CHAR-DROUET",
    );
    if (!drouet || drouet.mode !== "generated_dialogue") {
      throw new Error("Missing generated Drouet policy.");
    }

    Object.assign(drouet.fallbackTurns[0], { spokenResponse: "Unreviewed prose." });

    expect(modelPolicySchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects verified-record provenance on a fictional branch unit", () => {
    const invalid = structuredClone(policy);
    const drouet = invalid.stationPolicies.find(
      (station) => station.stationId === "CHAR-DROUET",
    );
    if (!drouet || drouet.mode !== "generated_dialogue") {
      throw new Error("Missing generated Drouet policy.");
    }

    Object.assign(drouet.claimUnits[0], {
      provenance: "verified_historical_record",
      countsAsHistoricalEvidence: true,
    });

    expect(modelPolicySchema.safeParse(invalid).success).toBe(false);
  });

  it("requires exact unique allowlists and compatible dramatized provenance", () => {
    const missingClaim = structuredClone(policy);
    const drouet = missingClaim.stationPolicies.find(
      (station) => station.stationId === "CHAR-DROUET",
    );
    if (!drouet || drouet.mode !== "generated_dialogue") {
      throw new Error("Missing generated Drouet policy.");
    }
    drouet.allowedClaimIds = [drouet.allowedClaimIds[0]!];
    expect(modelPolicySchema.safeParse(missingClaim).success).toBe(false);

    const duplicateStation = structuredClone(policy);
    duplicateStation.stationPolicies.push(structuredClone(duplicateStation.stationPolicies[0]!));
    expect(modelPolicySchema.safeParse(duplicateStation).success).toBe(false);

    const wrongProvenance = structuredClone(policy);
    const louis = wrongProvenance.stationPolicies.find(
      (station) => station.stationId === "CHAR-LOUIS",
    );
    if (!louis || louis.mode !== "generated_dialogue") {
      throw new Error("Missing generated Louis policy.");
    }
    louis.evidenceReactionUnits[0]!.provenance = "verified_historical_record";
    expect(modelPolicySchema.safeParse(wrongProvenance).success).toBe(false);
  });

  it("provides authored feedback templates for every model-selectable output", () => {
    expect(policy.feedbackUnits.summaryTemplates.map((unit) => unit.formativeStatus)).toEqual(
      expect.arrayContaining([
        "contradicted_by_record",
        "plausible_under_evidenced",
        "supported_incomplete",
        "well_supported",
      ]),
    );

    const criteria = [
      "sourcing",
      "corroboration",
      "causalReasoning",
      "claimEvidenceFit",
      "uncertainty",
    ];
    const scoreBands = ["missing", "developing", "strong"];

    for (const criterion of criteria) {
      for (const scoreBand of scoreBands) {
        expect(policy.feedbackUnits.rubricReasonTemplates).toContainEqual(
          expect.objectContaining({ criterion, scoreBand }),
        );
      }
    }

    expect(policy.feedbackUnits.revisionPromptTemplates.length).toBeGreaterThan(0);
    expect(policy.feedbackUnits.issueExplanationTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issueType: "unsupported" }),
        expect.objectContaining({ issueType: "overconfident" }),
      ]),
    );
  });

  it("gives every public prose unit standard and reduced authored text", () => {
    const stationUnits = policy.stationPolicies.flatMap((station) =>
      station.mode === "generated_dialogue"
        ? [
            ...station.claimUnits,
            ...station.evidenceReactionUnits,
            ...station.followUpQuestionUnits,
            ...station.refusalUnknownUnits,
            station.safetyRefusalUnit,
          ]
        : [],
    );
    const feedbackUnits = [
      ...policy.feedbackUnits.summaryTemplates,
      ...policy.feedbackUnits.rubricReasonTemplates,
      ...policy.feedbackUnits.revisionPromptTemplates,
      ...policy.feedbackUnits.issueExplanationTemplates,
    ];

    for (const unit of [...stationUnits, ...feedbackUnits]) {
      expect(unit.text.standard.trim().length).toBeGreaterThan(0);
      expect(unit.text.reduced.trim().length).toBeGreaterThan(0);
    }
  });
});
