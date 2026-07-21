"use client";

import { ArrowRight, RadioTower, Route, ShieldQuestion } from "lucide-react";

import { ProvenanceBadge } from "@/components/provenance/provenance-badge";
import type { CasePackage } from "@/schemas/case-package";

import styles from "./fracture-opening.module.css";

interface FractureOpeningProps {
  casePackage: CasePackage;
  onConfirm: () => void;
}

export function FractureOpening({ casePackage, onConfirm }: FractureOpeningProps) {
  const civicReconstruction = casePackage.evidence.find((item) => item.id === "E5");

  return (
    <main className={styles.fracture}>
      <header className={styles.masthead}>
        <span className={styles.wordmark}>Unchanged</span>
        <span className={styles.caseCode}>20-21 JUNE 1791 / TRACE LOST</span>
      </header>

      <section className={styles.trace} aria-labelledby="fracture-title">
        <div className={styles.traceHeading}>
          <div>
            <ProvenanceBadge contrast kind="branch_observation" />
            <p className={styles.eyebrow}>Temporal discrepancy / Bounded branch</p>
            <h1 id="fracture-title">The carriage passed Varennes.</h1>
          </div>
          <RadioTower aria-hidden="true" />
        </div>

        <div className={styles.route} aria-label="Fractured route trace">
          <span>DEPARTURE</span>
          <i />
          <span>ROUTE HANDOFF</span>
          <i className={styles.fracturedLine} />
          <span>VARENNES</span>
          <b>SIGNAL LOST</b>
        </div>

        <div className={styles.contradiction}>
          <article>
            <ProvenanceBadge contrast kind="historical_reconstruction" />
            <span className={styles.recordCode}>E5 / Reviewed sequence</span>
            <strong>{civicReconstruction?.studentExcerpt}</strong>
          </article>
          <article>
            <ProvenanceBadge contrast kind="branch_observation" />
            <span className={styles.recordCode}>Bounded fictional outcome</span>
            <strong>
              The carriage passes Varennes. The trace ends immediately beyond the town; no later
              alternate future is shown.
            </strong>
          </article>
        </div>
      </section>

      <section className={styles.candidates} aria-labelledby="candidates-title">
        <div className={styles.candidateHeading}>
          <div>
            <p className={styles.eyebrow}>Three candidates / One active fracture</p>
            <h2 id="candidates-title">What changed?</h2>
          </div>
          <p>Each candidate begins unresolved. Evidence must eliminate or support it.</p>
        </div>

        <div className={styles.candidateGrid}>
          {casePackage.anomalies.map((anomaly, index) => (
            <article className={styles.candidate} key={anomaly.id}>
              <div className={styles.candidateTopline}>
                <ProvenanceBadge kind="fictional_anomaly" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              {index === 0 ? (
                <ShieldQuestion aria-hidden="true" />
              ) : index === 1 ? (
                <Route aria-hidden="true" />
              ) : (
                <RadioTower aria-hidden="true" />
              )}
              <h3>{anomaly.title}</h3>
              <p>{anomaly.summary}</p>
              <span className={styles.unresolved}>Unresolved</span>
            </article>
          ))}
        </div>

        <div className={styles.mission}>
          <div>
            <span>CASE MISSION</span>
            <p>
              Identify the active fracture, reject the unsupported alternatives, and explain why
              the repaired link mattered inside a larger causal network.
            </p>
          </div>
          <button onClick={onConfirm} type="button">
            Confirm case mission
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
