import primerData from "@/data/cases/varennes/primer.json";
import type { CasePackage } from "@/schemas/case-package";
import {
  type ContextPrimer,
  contextPrimerSchema,
} from "@/schemas/context-primer";

export function loadVarennesPrimer(casePackage: CasePackage): ContextPrimer {
  const primer = contextPrimerSchema.parse(primerData);
  const verifiedFacts = new Set(
    casePackage.facts
      .filter((fact) => fact.verificationStatus === "verified")
      .map((fact) => fact.id),
  );

  for (const card of primer.cards) {
    if (card.factIds.some((factId) => !verifiedFacts.has(factId))) {
      throw new Error(`Primer card ${card.id} references an unverified or missing fact.`);
    }
  }

  const interpretationIds = new Set(primer.interpretations.map((item) => item.id));
  for (const card of primer.cards) {
    if (card.interpretationIds.some((id) => !interpretationIds.has(id))) {
      throw new Error(`Primer card ${card.id} references an unknown interpretation.`);
    }
  }

  return {
    ...primer,
    cards: primer.cards.toSorted((left, right) => left.sequence - right.sequence),
  };
}
