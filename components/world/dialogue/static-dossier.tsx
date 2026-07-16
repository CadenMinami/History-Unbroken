"use client";

import { X } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { useCaseSession } from "@/components/case-session/case-session-provider";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesModelPolicy } from "@/lib/openai/load-model-policy";

import styles from "../focus-overlay-host.module.css";

const casePackage = loadVarennesCase();
const modelPolicy = loadVarennesModelPolicy();

export type StaticDossierStationId =
  | "STATION-VARENNES-CIVIC"
  | "STATION-ASSEMBLY";

interface StaticDossierProps {
  invokerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  stationId: StaticDossierStationId;
}

export function StaticDossier({
  invokerRef,
  onClose,
  stationId,
}: StaticDossierProps) {
  const { issue, state } = useCaseSession();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const station = modelPolicy.stationPolicies.find(
    (candidate) => candidate.stationId === stationId,
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!station || station.mode !== "static_dossier") return null;
  const evidenceItems = station.allowedEvidenceIds.flatMap((evidenceId) => {
    const evidence = casePackage.evidence.find((item) => item.id === evidenceId);
    return evidence ? [evidence] : [];
  });

  function close() {
    onClose();
    queueMicrotask(() => invokerRef.current?.focus());
  }

  return (
    <div className={styles.scrim}>
      <section
        aria-labelledby={`static-dossier-${station.stationId}`}
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href]',
            ) ?? [],
          );
          const first = focusable[0];
          const last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <p>{station.roleLabel}</p>
            <span>Fixed dossier / no generated character</span>
          </div>
          <button aria-label="Close dossier" onClick={close} ref={closeRef} type="button">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.record}>
            <p className={styles.eyebrow}>Reviewed reconstruction station</p>
            <h2 id={`static-dossier-${station.stationId}`}>{station.name}</h2>
            <p>{station.disclosure}</p>
            {station.responseBoundaries.map((boundary) => (
              <p key={boundary}>{boundary}</p>
            ))}
            <p>
              Participant reports overlap in parts of this reconstruction;
              source count is not the same as independent corroboration.
            </p>
          </div>
          <aside className={styles.sources} aria-label="Available reviewed records">
            <p className={styles.eyebrow}>Canonical case records</p>
            {evidenceItems.map((evidence) => {
              const inspected = state.inspectedItemIds.includes(evidence.id);
              return (
                <article key={evidence.id}>
                  <span>{evidence.id} / cited historical reconstruction</span>
                  <h3>{evidence.title}</h3>
                  {inspected ? (
                    <>
                      <blockquote>{evidence.studentExcerpt}</blockquote>
                      <p>{evidence.description}</p>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        issue({ type: "inspect_item", itemId: evidence.id })
                      }
                      type="button"
                    >
                      Inspect {evidence.title}
                    </button>
                  )}
                </article>
              );
            })}
          </aside>
        </div>
        <footer>
          <p>
            This station is a fixed reconstruction. It cannot answer freeform
            questions or add claims beyond the reviewed records.
          </p>
        </footer>
      </section>
    </div>
  );
}
