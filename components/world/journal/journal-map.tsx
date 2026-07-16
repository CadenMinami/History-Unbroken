"use client";

import { MapPinned, ScanSearch, X } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { canFastTravelToZone } from "@/lib/world/spatial-session";
import type { CasePackage } from "@/schemas/case-package";
import type { SpatialSessionEnvelope } from "@/schemas/spatial-session";
import type { SceneManifest, WorldZoneId } from "@/schemas/world-manifest";

import styles from "./journal-map.module.css";

interface JournalMapProps {
  anomalyRecords: CasePackage["anomalies"];
  branchObservationRecords: CasePackage["branchObservations"];
  currentZoneId: WorldZoneId;
  inspectedRecordIds: readonly string[];
  invokerRef: RefObject<HTMLElement | null>;
  manifest: SceneManifest;
  onClose: () => void;
  onFastTravel: (destination: {
    zoneId: WorldZoneId;
    spawnId: string;
  }) => void;
  onInspectRecord: (recordId: string) => void;
  spatialSession: SpatialSessionEnvelope;
}

export function JournalMap({
  anomalyRecords,
  branchObservationRecords,
  currentZoneId,
  inspectedRecordIds,
  invokerRef,
  manifest,
  onClose,
  onFastTravel,
  onInspectRecord,
  spatialSession,
}: JournalMapProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inspected = new Set(inspectedRecordIds);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  function close() {
    onClose();
    queueMicrotask(() => invokerRef.current?.focus());
  }

  return (
    <div className={styles.scrim}>
      <section
        aria-labelledby="case-journal-heading"
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
          }
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
            <p>Spatial archive / navigation and fracture file</p>
            <h2 id="case-journal-heading">Case journal</h2>
          </div>
          <button
            aria-label="Close case journal"
            onClick={close}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.boundary}>
          <MapPinned aria-hidden="true" />
          <div>
            <strong>SCHEMATIC RECONSTRUCTION - NOT TO SCALE</strong>
            <p>
              This journal map is a navigation diagram of this reconstruction,
              not documented geography or chronology.
            </p>
          </div>
        </div>

        <section aria-label="Reconstruction route" className={styles.route}>
          <div className={styles.sectionHeading}>
            <p>Route compass</p>
            <h2>First discovery by walking, later travel by record</h2>
          </div>
          <div className={styles.zoneGrid}>
            {manifest.zones.map((zone, index) => {
              const current = zone.zoneId === currentZoneId;
              const discovered = spatialSession.discoveredZoneIds.includes(
                zone.zoneId,
              );
              const fastTravelAllowed =
                !current &&
                canFastTravelToZone(manifest, spatialSession, zone.zoneId);
              const safeReturnAllowed =
                current &&
                canFastTravelToZone(manifest, spatialSession, zone.zoneId);
              const safeSpawn = zone.safeSpawns[0];
              return (
                <article className={styles.zone} key={zone.zoneId}>
                  <span className={styles.sequence}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{zone.label}</h3>
                  <p>
                    {current
                      ? "Current location"
                      : discovered
                        ? "Discovered"
                        : "Undiscovered"}
                  </p>
                  {safeReturnAllowed ? (
                    <button
                      onClick={() =>
                        onFastTravel({
                          zoneId: zone.zoneId,
                          spawnId: safeSpawn.spawnId,
                        })
                      }
                      type="button"
                    >
                      Return to {zone.label} safe point
                    </button>
                  ) : fastTravelAllowed ? (
                    <button
                      onClick={() =>
                        onFastTravel({
                          zoneId: zone.zoneId,
                          spawnId: safeSpawn.spawnId,
                        })
                      }
                      type="button"
                    >
                      Fast travel to {zone.label}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section aria-label="Fracture records" className={styles.fracture}>
          <div className={styles.sectionHeading}>
            <p>Fictional fracture file</p>
            <h2>Inspect every candidate before comparing the branch</h2>
          </div>
          <p className={styles.fractureBoundary}>
            These records describe the authored counterfactual only. They are
            not historical evidence and do not count as corroboration.
          </p>
          <div className={styles.recordGrid}>
            {anomalyRecords.map((record) => (
              <article
                className={styles.record}
                data-presentation-weight="equal"
                data-testid={`fracture-record-${record.id}`}
                key={record.id}
              >
                <span>Fictional temporal anomaly</span>
                <h4>{record.title}</h4>
                <p>{record.summary}</p>
                <small>
                  {record.id} {inspected.has(record.id) ? "Inspected" : "Uninspected"}
                </small>
                <button
                  aria-label={`Inspect ${record.id}`}
                  onClick={() => onInspectRecord(record.id)}
                  type="button"
                >
                  <ScanSearch aria-hidden="true" />
                  {inspected.has(record.id) ? "Review" : "Inspect"}
                </button>
              </article>
            ))}
            {branchObservationRecords.map((record) => (
              <article
                className={styles.record}
                data-presentation-weight="equal"
                data-testid={`fracture-record-${record.id}`}
                key={record.id}
              >
                <span>Fictional branch observation</span>
                <h4>{record.title}</h4>
                <p>{record.content}</p>
                <small>
                  {record.id} {inspected.has(record.id) ? "Inspected" : "Uninspected"}
                </small>
                <button
                  aria-label={`Inspect ${record.id}`}
                  onClick={() => onInspectRecord(record.id)}
                  type="button"
                >
                  <ScanSearch aria-hidden="true" />
                  {inspected.has(record.id) ? "Review" : "Inspect"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <p>Walking remains available when you close this journal.</p>
          <Link href="/play/investigate">Open full comparison workspace</Link>
        </footer>
      </section>
    </div>
  );
}
