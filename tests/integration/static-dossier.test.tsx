import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { CaseSessionProvider, useCaseSession } from "@/components/case-session/case-session-provider";
import { StaticDossier } from "@/components/world/dialogue/static-dossier";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";

const casePackage = loadVarennesCase();

function SessionProbe() {
  const { state } = useCaseSession();
  return <output data-testid="inspected-items">{state.inspectedItemIds.join(",")}</output>;
}

describe("static world dossiers", () => {
  it("keeps the civic station fixed and inspects E5 only after an explicit reducer action", async () => {
    const user = userEvent.setup();
    const initialState = {
      ...createInitialCaseState(casePackage),
      phase: "investigation" as const,
    };

    render(
      <CaseSessionProvider initialState={initialState} persist={false}>
        <button ref={createRef<HTMLButtonElement>()}>Invoker</button>
        <StaticDossier
          invokerRef={createRef<HTMLButtonElement>()}
          onClose={() => undefined}
          stationId="STATION-VARENNES-CIVIC"
        />
        <SessionProbe />
      </CaseSessionProvider>,
    );

    expect(
      screen.getByRole("dialog", { name: /varennes civic record/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fixed reconstruction of collective civic action/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /ask/i })).toBeNull();
    expect(screen.getByTestId("inspected-items")).toHaveTextContent("");

    await user.click(
      screen.getByRole("button", {
        name: /inspect varennes civic-response dossier/i,
      }),
    );

    expect(screen.getByTestId("inspected-items")).toHaveTextContent("E5");
    expect(screen.getByText(/cited historical reconstruction/i)).toBeInTheDocument();
    expect(screen.getByText(/participant reports overlap/i)).toBeInTheDocument();
  });

  it("keeps the Assembly reaction packet situated and requires explicit E7 inspection", async () => {
    const user = userEvent.setup();
    const initialState = {
      ...createInitialCaseState(casePackage),
      phase: "investigation" as const,
    };

    render(
      <CaseSessionProvider initialState={initialState} persist={false}>
        <StaticDossier
          invokerRef={createRef<HTMLButtonElement>()}
          onClose={() => undefined}
          stationId="STATION-ASSEMBLY"
        />
        <SessionProbe />
      </CaseSessionProvider>,
    );

    expect(
      screen.getByRole("dialog", { name: /assembly reaction dossier/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/situated position, not national consensus/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("inspected-items")).toHaveTextContent("");

    await user.click(
      screen.getByRole("button", {
        name: /inspect immediate political-reaction packet/i,
      }),
    );

    expect(screen.getByTestId("inspected-items")).toHaveTextContent("E7");
    expect(
      screen.getByText(/without claiming universal opinion or inevitable collapse/i),
    ).toBeInTheDocument();
  });
});
