"use client";

import { X } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { CharacterConversationPanel } from "@/components/characters/character-conversation-panel";
import type { StationId } from "@/components/characters/character-interview";

import styles from "./cinematic-conversation.module.css";

interface CinematicConversationProps {
  fallbackFocusRef: RefObject<HTMLElement | null>;
  invokerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  stationId: StationId;
}

const stationPresentation: Record<
  StationId,
  { heading: string; initials: string; subtitle: string; boundary: string }
> = {
  "CHAR-DROUET": {
    heading: "Jean-Baptiste Drouet",
    initials: "JD",
    subtitle: "Witness to the altered route",
    boundary:
      "Dramatized dialogue is limited to this station's authored knowledge. It is formative, not historical evidence.",
  },
  "CHAR-LOUIS": {
    heading: "Louis XVI",
    initials: "LXVI",
    subtitle: "Public position in the declaration",
    boundary:
      "Dramatized dialogue is limited to Louis's stated declaration. It cannot establish a complete private motive or become historical evidence.",
  },
};

export function CinematicConversation({
  fallbackFocusRef,
  invokerRef,
  onClose,
  stationId,
}: CinematicConversationProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const presentation = stationPresentation[stationId];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  function close() {
    onClose();
    queueMicrotask(() => (invokerRef.current ?? fallbackFocusRef.current)?.focus());
  }

  return (
    <div className={styles.scrim}>
      <section
        aria-label={`Conversation with ${presentation.heading} station`}
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
          if (event.key !== "Tab") return;

          const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), select:not([disabled]), textarea:not([disabled])',
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
        <header>
          <div>
            <p>Source station / Dramatized dialogue</p>
            <h2 id="world-conversation-heading">{presentation.heading}</h2>
            <small>{presentation.subtitle}</small>
          </div>
          <button aria-label="Close conversation" onClick={close} ref={closeRef} type="button">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.portrait} aria-hidden="true">
            <span>{presentation.initials}</span>
          </div>
          <div className={styles.panel}>
            <p className={styles.disclosure}>
              {presentation.boundary}
            </p>
            <CharacterConversationPanel stationId={stationId} />
          </div>
        </div>
      </section>
    </div>
  );
}
