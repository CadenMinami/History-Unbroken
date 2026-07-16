import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import PlayPage from "@/app/play/page";
import { CaseSessionProvider } from "@/components/case-session/case-session-provider";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import { SPATIAL_SESSION_STORAGE_KEY } from "@/lib/world/spatial-session";

const casePackage = loadVarennesCase();

function renderModeSelector() {
  const state = {
    ...createInitialCaseState(casePackage),
    phase: "investigation" as const,
    revision: 2,
    completedCommandIds: ["to-fracture", "to-investigation"],
  };
  return render(
    <CaseSessionProvider initialState={state} persist={false}>
      <PlayPage />
    </CaseSessionProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("investigation mode selection", () => {
  it("offers both information-equivalent investigation routes directly", () => {
    renderModeSelector();

    expect(
      screen.getByRole("link", { name: /enter 3d reconstruction/i }),
    ).toHaveAttribute("href", "/play/world");
    expect(
      screen.getByRole("link", { name: /use non-spatial investigation/i }),
    ).toHaveAttribute("href", "/play/investigate");
    expect(screen.getByText(/same evidence and repair requirements/i)).toBeInTheDocument();
  });

  it.each([
    ["Enter 3D reconstruction", "spatial"],
    ["Use non-spatial investigation", "non_spatial"],
  ])("persists only the voluntary %s preference", async (linkName, expectedMode) => {
    const user = userEvent.setup();
    renderModeSelector();

    const link = screen.getByRole("link", { name: linkName });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    await user.click(link);

    const stored = JSON.parse(
      window.localStorage.getItem(SPATIAL_SESSION_STORAGE_KEY) ?? "null",
    );
    expect(stored.mode).toBe(expectedMode);
    expect(stored).not.toHaveProperty("pinnedEvidenceIds");
    expect(stored).not.toHaveProperty("revision");
  });
});
