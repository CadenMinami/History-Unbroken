import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import PlayPage from "@/app/play/page";
import {
  CaseSessionProvider,
  useCaseSession,
} from "@/components/case-session/case-session-provider";

function PhaseProbe() {
  const { state } = useCaseSession();
  return <output data-testid="phase-probe">{state.phase}</output>;
}

function renderPlay() {
  return render(
    <CaseSessionProvider persist={false}>
      <PlayPage />
      <PhaseProbe />
    </CaseSessionProvider>,
  );
}

describe("context primer and fracture opening", () => {
  it("teaches six context steps without requiring prior knowledge", async () => {
    const user = userEvent.setup();
    renderPlay();

    expect(screen.getByText("1 of 6")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "France is in revolution" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue context/i }));
    expect(screen.getByRole("heading", { name: "France still has a king" })).toHaveFocus();

    for (let step = 3; step <= 6; step += 1) {
      await user.click(screen.getByRole("button", { name: /continue context/i }));
      expect(screen.getByText(`${step} of 6`)).toBeInTheDocument();
    }

    expect(
      screen.getByText(/you are not expected to know what happens next/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open temporal fracture/i })).toBeInTheDocument();
  });

  it("keeps fact boundaries intact in reduced-reading mode", async () => {
    const user = userEvent.setup();
    renderPlay();

    for (let step = 2; step <= 4; step += 1) {
      await user.click(screen.getByRole("button", { name: /continue context/i }));
    }
    await user.click(screen.getByRole("checkbox", { name: /reduced reading/i }));

    expect(screen.getByText(/18 April/i)).toBeInTheDocument();
    expect(screen.getByText(/National Guard/i)).toBeInTheDocument();
    expect(screen.getByText(/Saint-Cloud/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue context/i }));
    expect(screen.getByText(/interpretation, not a measured national fact/i)).toBeInTheDocument();
  });

  it("shows three equally labeled fictional candidates before the investigation", async () => {
    const user = userEvent.setup();
    renderPlay();

    for (let step = 2; step <= 6; step += 1) {
      await user.click(screen.getByRole("button", { name: /continue context/i }));
    }
    await user.click(screen.getByRole("button", { name: /open temporal fracture/i }));

    expect(screen.getByTestId("phase-probe")).toHaveTextContent("fracture");
    expect(screen.getAllByText("Fictional temporal anomaly")).toHaveLength(3);
    expect(screen.getByText("Historical reconstruction")).toBeInTheDocument();
    expect(screen.getAllByText("Fictional branch observation")).toHaveLength(2);
    expect(screen.queryByText(/before any warning or civic alarm/i)).toBeNull();
  });

  it("requires explicit mission confirmation before entering investigation", async () => {
    const user = userEvent.setup();
    renderPlay();

    for (let step = 2; step <= 6; step += 1) {
      await user.click(screen.getByRole("button", { name: /continue context/i }));
    }
    await user.click(screen.getByRole("button", { name: /open temporal fracture/i }));
    await user.click(screen.getByRole("button", { name: /confirm case mission/i }));

    expect(screen.getByTestId("phase-probe")).toHaveTextContent("investigation");
    expect(screen.getByRole("link", { name: /enter 3d reconstruction/i })).toHaveAttribute(
      "href",
      "/play/world",
    );
    expect(screen.getByRole("link", { name: /use non-spatial investigation/i })).toHaveAttribute(
      "href",
      "/play/investigate",
    );
  });
});
