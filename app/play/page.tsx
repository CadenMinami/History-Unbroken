"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useCaseSession } from "@/components/case-session/case-session-provider";
import { FractureOpening } from "@/components/fracture/fracture-opening";
import { InvestigationModeSelector } from "@/components/investigation-mode/investigation-mode-selector";
import { ContextPrimerView } from "@/components/primer/context-primer";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesPrimer } from "@/lib/case-engine/load-primer";

const casePackage = loadVarennesCase();
const primer = loadVarennesPrimer(casePackage);

export default function PlayPage() {
  const { state, ready, issue } = useCaseSession();

  if (!ready) {
    return (
      <main className="case-entry">
        <section className="case-entry__workspace" aria-busy="true" aria-live="polite">
          <div className="case-entry__brief">
            <p className="eyebrow">Case archive / Restoring session</p>
            <h1>Reopening the record.</h1>
          </div>
        </section>
      </main>
    );
  }

  if (state.phase === "primer") {
    return (
      <ContextPrimerView
        onComplete={() => issue({ type: "advance_phase", phase: "fracture" })}
        primer={primer}
      />
    );
  }

  if (state.phase === "fracture") {
    return (
      <FractureOpening
        casePackage={casePackage}
        onConfirm={() => issue({ type: "advance_phase", phase: "investigation" })}
      />
    );
  }

  const choosingInvestigationMode = state.phase === "investigation";

  return (
    <main className="case-entry">
      <header className="case-entry__masthead">
        <span className="wordmark">History Unbroken</span>
        <span className="archive-code">CASE 01 / SESSION READY</span>
      </header>
      <section className="case-entry__workspace">
        <div
          className={`case-entry__brief${
            choosingInvestigationMode ? " case-entry__brief--wide" : ""
          }`}
        >
          <p className="eyebrow">Context secured / Investigation authorized</p>
          <h1>The archive is open.</h1>
          <p className="case-entry__summary">
            The fracture candidates remain unresolved. Compare the branch observations with
            reviewed evidence before committing to a repair.
          </p>
          {choosingInvestigationMode ? (
            <InvestigationModeSelector />
          ) : (
            <Link className="primary-command" href="/play/caseboard">
              Return to caseboard
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
