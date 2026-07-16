import { FormEvent, useState } from "react";
import { FileSignature, Send } from "lucide-react";

import type { CasePackage } from "@/schemas/case-package";
import {
  CASE_BRIEF_ARGUMENT_MAX_LENGTH,
  type CaseState,
} from "@/schemas/case-state";

import styles from "./causal-caseboard.module.css";

interface CaseBriefFormProps {
  casePackage: CasePackage;
  caseBrief: CaseState["caseBrief"];
  onSubmit: (draft: Omit<CaseState["caseBrief"], "submitted">) => void;
}

export function CaseBriefForm({ casePackage, caseBrief, onSubmit }: CaseBriefFormProps) {
  const [argument, setArgument] = useState(caseBrief.argument);
  const [selectedConsequenceId, setSelectedConsequenceId] = useState(
    caseBrief.selectedConsequenceId,
  );
  const [selectedUncertaintyIds, setSelectedUncertaintyIds] = useState(
    caseBrief.selectedUncertaintyIds,
  );

  const consequenceOptions = casePackage.causalNodes.filter((node) =>
    casePackage.solution.limitedConsequenceIds.includes(node.id),
  );

  function toggleUncertainty(uncertaintyId: string) {
    setSelectedUncertaintyIds((current) =>
      current.includes(uncertaintyId)
        ? current.filter((id) => id !== uncertaintyId)
        : [...current, uncertaintyId],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ argument, selectedConsequenceId, selectedUncertaintyIds });
  }

  return (
    <section className={styles.briefBand} aria-labelledby="brief-heading">
      <div className={styles.sectionIntro}>
        <span>03</span>
        <div>
          <p className={styles.eyebrow}>Case Brief</p>
          <h2 id="brief-heading">Commit your explanation</h2>
          <p>
            The controls preserve historical boundaries. Your prose records your reasoning and can
            receive formative feedback later, but prose cannot unlock or block the repair.
          </p>
        </div>
      </div>

      <form className={styles.briefForm} onSubmit={submit}>
        <fieldset>
          <legend>Choose one bounded consequence</legend>
          {consequenceOptions.map((consequence) => (
            <label key={consequence.id}>
              <input
                checked={selectedConsequenceId === consequence.id}
                name="consequence"
                onChange={() => setSelectedConsequenceId(consequence.id)}
                type="radio"
              />
              <span>{consequence.label}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Acknowledge what the evidence does not prove</legend>
          {casePackage.uncertainties.map((uncertainty) => (
            <label key={uncertainty.id}>
              <input
                checked={selectedUncertaintyIds.includes(uncertainty.id)}
                onChange={() => toggleUncertainty(uncertainty.id)}
                type="checkbox"
              />
              <span>{uncertainty.label}</span>
            </label>
          ))}
        </fieldset>

        <label className={styles.argumentLabel} htmlFor="case-argument">
          <span>Argument in your own words</span>
          <textarea
            id="case-argument"
            maxLength={CASE_BRIEF_ARGUMENT_MAX_LENGTH}
            onChange={(event) => setArgument(event.target.value)}
            placeholder="Explain which link changed, how it affected the journey, and why the event mattered within broader conditions."
            rows={7}
            value={argument}
          />
        </label>

        <div className={styles.submitRow}>
          <FileSignature aria-hidden="true" />
          <p>Submitting records this board as your current hypothesis. Later board changes require resubmission.</p>
          <button type="submit">
            Save and submit Case Brief
            <Send aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
