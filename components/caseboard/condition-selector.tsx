import { Check, Plus, X } from "lucide-react";

import type { CasePackage } from "@/schemas/case-package";

import styles from "./causal-caseboard.module.css";

type Condition = CasePackage["conditions"][number];

interface ConditionSelectorProps {
  conditions: Condition[];
  selectedIds: Set<string>;
  onToggle: (conditionId: string, selected: boolean) => void;
}

const categoryLabels = {
  background: "Background",
  journey: "Journey",
  geographic: "Geographic",
  civic: "Civic",
};

export function ConditionSelector({ conditions, selectedIds, onToggle }: ConditionSelectorProps) {
  return (
    <section className={styles.conditionBand} aria-labelledby="conditions-heading">
      <div className={styles.sectionIntro}>
        <span>01</span>
        <div>
          <p className={styles.eyebrow}>Broader conditions</p>
          <h2 id="conditions-heading">Explain why the link could matter</h2>
          <p>
            Choose at least one background condition and one journey, geographic, or civic
            condition. A condition shapes the event; it does not guarantee the outcome.
          </p>
        </div>
      </div>
      <div className={styles.conditionGrid}>
        {conditions.map((condition) => {
          const selected = selectedIds.has(condition.id);
          return (
            <article className={selected ? styles.conditionSelected : styles.condition} key={condition.id}>
              <div>
                <span className={styles.category}>{categoryLabels[condition.category]}</span>
                {selected ? <Check aria-hidden="true" /> : null}
              </div>
              <h3>{condition.label}</h3>
              <button
                aria-label={`${selected ? "Remove" : "Select"} condition: ${condition.label}`}
                aria-pressed={selected}
                onClick={() => onToggle(condition.id, selected)}
                type="button"
              >
                {selected ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {selected ? "Remove" : "Select"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
