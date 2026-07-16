import { createRef } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { JournalMap } from "@/components/world/journal/journal-map";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { loadVarennesSceneManifest } from "@/lib/world/scene-manifest";
import {
  createInitialSpatialSession,
  recordZoneVisit,
} from "@/lib/world/spatial-session";

const casePackage = loadVarennesCase();
const manifest = loadVarennesSceneManifest();

function discoveredPostRoadSession() {
  const postRoadZone = manifest.zones.find(
    (zone) => zone.zoneId === "post-road-square",
  );
  if (!postRoadZone) throw new Error("Missing post-road zone fixture.");

  const result = recordZoneVisit(manifest, createInitialSpatialSession(manifest), {
    zoneId: postRoadZone.zoneId,
    spawnId: postRoadZone.safeSpawns[0].spawnId,
  });
  if (!result.accepted) throw new Error("Expected post-road discovery fixture.");
  return result.session;
}

function returnedToArchiveSession() {
  const postRoadSession = discoveredPostRoadSession();
  const archiveZone = manifest.zones.find(
    (zone) => zone.zoneId === "archive-antechamber",
  );
  if (!archiveZone) throw new Error("Missing archive zone fixture.");

  const result = recordZoneVisit(manifest, postRoadSession, {
    zoneId: archiveZone.zoneId,
    spawnId: archiveZone.safeSpawns[0].spawnId,
  });
  if (!result.accepted) throw new Error("Expected archive return fixture.");
  return result.session;
}

describe("JournalMap", () => {
  it("presents authored navigation and fracture records without implying an active anomaly", () => {
    const invokerRef = createRef<HTMLButtonElement>();

    render(
      <>
        <button ref={invokerRef} type="button">
          Open journal
        </button>
        <JournalMap
          anomalyRecords={casePackage.anomalies}
          branchObservationRecords={casePackage.branchObservations}
          currentZoneId="post-road-square"
          inspectedRecordIds={["E6A", "FO2"]}
          invokerRef={invokerRef}
          manifest={manifest}
          onClose={vi.fn()}
          onFastTravel={vi.fn()}
          onInspectRecord={vi.fn()}
          spatialSession={discoveredPostRoadSession()}
        />
      </>,
    );

    expect(screen.getByRole("dialog", { name: "Case journal" })).toBeInTheDocument();

    const route = screen.getByRole("region", { name: "Reconstruction route" });
    expect(
      within(route)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(manifest.zones.map((zone) => zone.label));
    expect(within(route).getByText("Current location")).toBeInTheDocument();
    expect(within(route).getByText("Discovered")).toBeInTheDocument();
    expect(within(route).getAllByText("Undiscovered")).toHaveLength(2);
    expect(
      within(route).getByRole("button", {
        name: "Return to Post-road square safe point",
      }),
    ).toBeInTheDocument();
    expect(within(route).queryByRole("button", { name: /fast travel to/i })).toBeNull();

    const fractureRecords = screen.getByRole("region", { name: "Fracture records" });
    expect(
      within(fractureRecords).getAllByText("Fictional temporal anomaly"),
    ).toHaveLength(3);
    expect(
      within(fractureRecords).getAllByText("Fictional branch observation"),
    ).toHaveLength(3);
    expect(
      within(fractureRecords)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual([
      ...casePackage.anomalies.map((record) => record.title),
      ...casePackage.branchObservations.map((record) => record.title),
    ]);

    const anomalyCards = casePackage.anomalies.map((record) =>
      screen.getByTestId(`fracture-record-${record.id}`),
    );
    expect(new Set(anomalyCards.map((card) => card.className)).size).toBe(1);
    for (const card of anomalyCards) {
      expect(card).toHaveAttribute("data-presentation-weight", "equal");
    }
    expect(
      within(fractureRecords).getAllByRole("button", {
        name: /^inspect (E6|FO)/i,
      }),
    ).toHaveLength(6);
    expect(fractureRecords).toHaveTextContent("E6A Inspected");
    expect(fractureRecords).toHaveTextContent("FO2 Inspected");
    expect(fractureRecords).not.toHaveTextContent(/active anomaly|best fit|eliminated/i);

    expect(
      screen.getByText("SCHEMATIC RECONSTRUCTION - NOT TO SCALE"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This journal map is a navigation diagram of this reconstruction, not documented geography or chronology.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full comparison workspace" }),
    ).toHaveAttribute("href", "/play/investigate");
  });

  it("offers only a discovered destination authorized by the manifest", () => {
    const invokerRef = createRef<HTMLButtonElement>();

    render(
      <JournalMap
        anomalyRecords={casePackage.anomalies}
        branchObservationRecords={casePackage.branchObservations}
        currentZoneId="archive-antechamber"
        inspectedRecordIds={[]}
        invokerRef={invokerRef}
        manifest={manifest}
        onClose={vi.fn()}
        onFastTravel={vi.fn()}
        onInspectRecord={vi.fn()}
        spatialSession={returnedToArchiveSession()}
      />,
    );

    const route = screen.getByRole("region", { name: "Reconstruction route" });
    expect(within(route).getAllByRole("button", { name: /fast travel to/i })).toHaveLength(1);
    expect(
      within(route).getByRole("button", {
        name: "Fast travel to Post-road square",
      }),
    ).toBeInTheDocument();
    expect(
      within(route).queryByRole("button", {
        name: "Fast travel to Archive antechamber",
      }),
    ).toBeNull();
  });

  it("routes bounded journal actions and restores focus when closed", async () => {
    const user = userEvent.setup();
    const invokerRef = createRef<HTMLButtonElement>();
    const onClose = vi.fn();
    const onFastTravel = vi.fn();
    const onInspectRecord = vi.fn();

    render(
      <>
        <button ref={invokerRef} type="button">
          Open journal
        </button>
        <JournalMap
          anomalyRecords={casePackage.anomalies}
          branchObservationRecords={casePackage.branchObservations}
          currentZoneId="archive-antechamber"
          inspectedRecordIds={[]}
          invokerRef={invokerRef}
          manifest={manifest}
          onClose={onClose}
          onFastTravel={onFastTravel}
          onInspectRecord={onInspectRecord}
          spatialSession={returnedToArchiveSession()}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Inspect E6A" }));
    expect(onInspectRecord).toHaveBeenCalledWith("E6A");

    await user.click(
      screen.getByRole("button", { name: "Fast travel to Post-road square" }),
    );
    expect(onFastTravel).toHaveBeenCalledWith({
      zoneId: "post-road-square",
      spawnId: "SPAWN-POST-ROAD-ENTRY",
    });

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(invokerRef.current).toHaveFocus();
  });
});
