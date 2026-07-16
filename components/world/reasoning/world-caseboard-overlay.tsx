"use client";

import { X } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { CausalCaseboard } from "@/components/caseboard/causal-caseboard";

import styles from "./world-caseboard-overlay.module.css";

interface WorldCaseboardOverlayProps {
  invokerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function WorldCaseboardOverlay({
  invokerRef,
  onClose,
}: WorldCaseboardOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

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
        aria-labelledby="world-caseboard-heading"
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
          if (event.key !== "Tab") return;

          const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
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
        <div className={styles.toolbar}>
          <div>
            <p>Investigation overlay / Deterministic case state</p>
            <h2 id="world-caseboard-heading">Causal caseboard</h2>
          </div>
          <button
            aria-label="Close causal caseboard"
            onClick={close}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.content}>
          <CausalCaseboard embedded returnHref="/play/world" />
        </div>
      </section>
    </div>
  );
}
