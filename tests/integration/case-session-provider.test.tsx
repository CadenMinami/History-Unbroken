import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  CaseSessionProvider,
  useCaseSession,
} from "@/components/case-session/case-session-provider";

function Harness() {
  const { state, issue, ready } = useCaseSession();
  const [resultText, setResultText] = useState("");

  return (
    <div>
      <output>{state.phase}</output>
      <output data-testid="session-readiness">{ready ? "ready" : "loading"}</output>
      <button onClick={() => issue({ type: "advance_phase", phase: "fracture" })}>
        Advance
      </button>
      <button
        onClick={() => {
          const first = issue({ type: "advance_phase", phase: "fracture" });
          const second = issue({ type: "advance_phase", phase: "investigation" });
          setResultText(
            `${first.status}:${first.state.revision}/${second.status}:${second.state.revision}`,
          );
        }}
      >
        Advance twice
      </button>
      <button
        onClick={() => {
          const result = issue({ type: "inspect_item", itemId: "UNKNOWN" });
          setResultText(`${result.status}:${result.reason ?? "none"}`);
        }}
      >
        Reject command
      </button>
      <output data-testid="command-result">{resultText}</output>
    </div>
  );
}

describe("case session provider", () => {
  it("dispatches typed commands through the deterministic reducer", async () => {
    const user = userEvent.setup();
    render(
      <CaseSessionProvider persist={false}>
        <Harness />
      </CaseSessionProvider>,
    );

    expect(screen.getByText("primer")).toBeInTheDocument();
    expect(screen.getByTestId("session-readiness")).toHaveTextContent("ready");
    await user.click(screen.getByRole("button", { name: "Advance" }));
    expect(screen.getByText("fracture")).toBeInTheDocument();
  });

  it("returns exact synchronous reducer results for successive commands", async () => {
    const user = userEvent.setup();
    render(
      <CaseSessionProvider persist={false}>
        <Harness />
      </CaseSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Advance twice" }));

    expect(screen.getByTestId("command-result")).toHaveTextContent(
      "applied:1/applied:2",
    );
    expect(screen.getByText("investigation")).toBeInTheDocument();
  });

  it("returns a reducer rejection without changing current state", async () => {
    const user = userEvent.setup();
    render(
      <CaseSessionProvider persist={false}>
        <Harness />
      </CaseSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Reject command" }));

    expect(screen.getByTestId("command-result")).toHaveTextContent(
      "rejected:command-not-allowed-in-phase",
    );
    expect(screen.getByText("primer")).toBeInTheDocument();
  });

  it("does not report readiness until persisted state restoration finishes", async () => {
    window.localStorage.clear();

    render(
      <CaseSessionProvider>
        <Harness />
      </CaseSessionProvider>,
    );

    expect(screen.getByTestId("session-readiness")).toHaveTextContent("loading");
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });
});
