"use client";

import { ArrowRight, Box, Files, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import { persistInvestigationMode } from "@/lib/world/spatial-session";
import type { InvestigationMode } from "@/schemas/spatial-session";

import styles from "./investigation-mode-selector.module.css";

const manifest = loadVarennesSceneManifest();

function rememberMode(mode: InvestigationMode) {
  persistInvestigationMode(window.localStorage, manifest, mode);
}

export function InvestigationModeSelector() {
  return (
    <section className={styles.selector} aria-labelledby="investigation-mode-heading">
      <div className={styles.heading}>
        <p>Choose an investigation route</p>
        <h2 id="investigation-mode-heading">Enter the record.</h2>
      </div>

      <div className={styles.options}>
        <article>
          <Box aria-hidden="true" />
          <div>
            <span>Embodied route</span>
            <h3>Spatial reconstruction</h3>
            <p>Move through a compact schematic district and open reviewed records in focused overlays.</p>
          </div>
          <Link href="/play/world" onClick={() => rememberMode("spatial")}>
            Enter 3D reconstruction
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article>
          <Files aria-hidden="true" />
          <div>
            <span>Direct route</span>
            <h3>Archive workspace</h3>
            <p>Use the complete document-first investigation without loading or navigating a 3D scene.</p>
          </div>
          <Link href="/play/investigate" onClick={() => rememberMode("non_spatial")}>
            Use non-spatial investigation
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </div>

      <p className={styles.equivalence}>
        <ShieldCheck aria-hidden="true" />
        Both routes use the same evidence and repair requirements.
      </p>
    </section>
  );
}
