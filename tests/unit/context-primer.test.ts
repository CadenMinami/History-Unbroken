import { describe, expect, it } from "vitest";

import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesPrimer } from "@/lib/case-engine/load-primer";
import { contextPrimerSchema } from "@/schemas/context-primer";

const casePackage = loadVarennesCase();
const primer = loadVarennesPrimer(casePackage);

describe("Varennes context primer", () => {
  it("contains six ordered, source-controlled novice context steps", () => {
    expect(primer.cards).toHaveLength(6);
    expect(primer.cards.map((card) => card.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(primer.cards.every((card) => card.factIds.length > 0)).toBe(true);
  });

  it("references only verified facts in the frozen case package", () => {
    const facts = new Map(casePackage.facts.map((fact) => [fact.id, fact]));

    for (const card of primer.cards) {
      for (const factId of card.factIds) {
        expect(facts.get(factId)?.verificationStatus).toBe("verified");
      }
    }
  });

  it("preserves every authored retention term in standard and reduced-reading copy", () => {
    for (const card of primer.cards) {
      for (const retainedTerm of card.retainedTerms) {
        expect(card.standardText.toLowerCase()).toContain(retainedTerm.toLowerCase());
        expect(card.reducedText.toLowerCase()).toContain(retainedTerm.toLowerCase());
      }
    }
  });

  it("keeps contested context in a non-scoring interpretation registry", () => {
    const contestedCard = primer.cards.find((card) => card.id === "PRIMER-05");

    expect(contestedCard?.interpretationIds).toEqual(["I-S11-001", "I-S11-002"]);
    expect(primer.interpretations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "I-S11-001",
          authority: "orientation_only",
          conditionEligible: false,
        }),
        expect.objectContaining({
          id: "I-S11-002",
          authority: "orientation_only",
          conditionEligible: false,
        }),
      ]),
    );
  });

  it("rejects a contested context card that drops either side of the required pairing", () => {
    const oneSided = structuredClone(primer);
    const contestedCard = oneSided.cards.find((card) => card.id === "PRIMER-05");
    if (!contestedCard) throw new Error("Missing contested primer card.");
    contestedCard.interpretationIds = ["I-S11-001"];

    expect(contextPrimerSchema.safeParse(oneSided).success).toBe(false);
  });

  it("does not reveal the investigation mechanism or active anomaly", () => {
    const allPrimerText = JSON.stringify(primer).toLowerCase();

    for (const forbiddenTerm of [
      "drouet",
      "sauce",
      "bridge",
      "route correction",
      "recognition echo",
      "route echo",
      "authorization echo",
      "e6a",
      "e6b",
      "e6c",
    ]) {
      expect(allPrimerText).not.toContain(forbiddenTerm);
    }
  });
});
