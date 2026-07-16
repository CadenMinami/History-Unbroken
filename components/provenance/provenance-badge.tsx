import { CircleDotDashed, FileCheck2 } from "lucide-react";

import styles from "./provenance-badge.module.css";

interface ProvenanceBadgeProps {
  kind:
    | "verified_context"
    | "historical_reconstruction"
    | "contested_interpretation"
    | "fictional_anomaly"
    | "branch_observation";
  contrast?: boolean;
}

const labels = {
  verified_context: "Verified context",
  historical_reconstruction: "Historical reconstruction",
  contested_interpretation: "Contested interpretation",
  fictional_anomaly: "Fictional temporal anomaly",
  branch_observation: "Fictional branch observation",
} as const;

export function ProvenanceBadge({ kind, contrast = false }: ProvenanceBadgeProps) {
  const isHistorical = kind === "verified_context" || kind === "historical_reconstruction";
  return (
    <span className={`${styles[kind]} ${contrast ? styles.contrast : ""}`}>
      {isHistorical ? <FileCheck2 aria-hidden="true" /> : <CircleDotDashed aria-hidden="true" />}
      {labels[kind]}
    </span>
  );
}
