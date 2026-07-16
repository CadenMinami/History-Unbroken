import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import InvestigationPage from "@/app/play/investigate/page";
import { CaseSessionProvider } from "@/components/case-session/case-session-provider";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";

const casePackage = loadVarennesCase();

function investigationState() {
  return {
    ...createInitialCaseState(casePackage),
    phase: "investigation" as const,
    revision: 2,
    completedCommandIds: ["to-fracture", "to-investigation"],
  };
}

function renderInvestigation(state = investigationState()) {
  return render(
    <CaseSessionProvider initialState={state} persist={false}>
      <InvestigationPage />
    </CaseSessionProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("investigation workspace", () => {
  it("gates the workspace when the case has not reached investigation", () => {
    render(
      <CaseSessionProvider persist={false}>
        <InvestigationPage />
      </CaseSessionProvider>,
    );

    expect(screen.getByRole("heading", { name: /investigation locked/i })).toBeInTheDocument();
    expect(screen.queryByTestId("inspect-E3")).toBeNull();
  });

  it("keeps historical evidence and fictional branch observations visibly separate", () => {
    renderInvestigation();

    expect(screen.getAllByText("Historical evidence")).toHaveLength(6);
    expect(screen.getAllByText("Fictional temporal anomaly")).toHaveLength(3);
    expect(screen.getAllByText("Fictional branch observation")).toHaveLength(3);
    expect(screen.getByText(/never count as historical evidence/i)).toBeInTheDocument();
    expect(screen.queryByText("STE-MENEHOULD")).toBeNull();
    expect(
      screen.getByRole("button", { name: /complete all findings to open the caseboard/i }),
    ).toBeDisabled();
  });

  it("records an earned comparison before allowing anomaly rejection", async () => {
    const user = userEvent.setup();
    renderInvestigation();

    for (const itemId of ["E6A", "FO1", "E3", "E4"]) {
      await user.click(screen.getByTestId(`inspect-${itemId}`));
    }

    const recordButton = screen.getByRole("button", { name: /record recognition finding/i });
    expect(recordButton).toBeEnabled();
    await user.click(recordButton);

    expect(screen.getByText(/FO1 records that Drouet suspected/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /eliminate recognition echo/i }));
    expect(screen.getByTestId("anomaly-status-E6A")).toHaveTextContent("Eliminated");
  });

  it("pins inspected historical evidence but never offers that action for branch fiction", async () => {
    const user = userEvent.setup();
    renderInvestigation();

    await user.click(screen.getByTestId("inspect-E3"));
    await user.click(screen.getByRole("button", { name: /pin Drouet's report/i }));

    expect(screen.getByTestId("notebook-pinned-count")).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: /pin Altered Drouet Station Record/i })).toBeNull();
  });

  it("uses inspected evidence in a visibly dramatized, non-countable character turn", async () => {
    const user = userEvent.setup();
    const state = { ...investigationState(), revision: 3, inspectedItemIds: ["E3"] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        return Response.json({
          contractVersion: request.contractVersion,
          caseId: request.caseId,
          caseSchemaVersion: request.caseSchemaVersion,
          caseVersion: request.caseVersion,
          policyVersion: request.policyVersion,
          stateVersion: request.stateVersion,
          requestId: request.requestId,
          stateRevision: request.stateRevision,
          promptVersion: request.promptVersion,
          status: "ok",
          source: "model",
          authority: "formative_only",
          mutatesCaseState: false,
          speechAuthorization: null,
          turn: {
            spokenResponse:
              "The verified historical report conflicts with my experience in this fictional branch.",
            renderedUnitIds: ["REACTION-DROUET-E3-QUALIFY"],
            claimIds: [],
            factIdsUsed: ["F-S2-002"],
            sourceIdsUsed: ["S2"],
            evidenceIdsReferenced: ["E3"],
            epistemicStatus: "inferred",
            evidenceReaction: "qualified",
            followUpQuestion: "Which other record checks the timing?",
          },
        });
      }),
    );
    renderInvestigation(state);

    await user.selectOptions(screen.getByLabelText(/present inspected evidence/i), "E3");
    await user.type(
      screen.getByLabelText(/question for the source station/i),
      "What changes when I compare this report with your branch?",
    );
    await user.click(screen.getByRole("button", { name: /ask source/i }));

    expect(await screen.findByText(/verified historical report conflicts/i)).toBeInTheDocument();
    expect(screen.getByText(/ai-directed dramatization/i)).toBeInTheDocument();
    expect(screen.getAllByText(/fictional branch/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /pin.*response/i })).toBeNull();
  });

  it("invalidates a pending character answer when the question draft changes", async () => {
    const user = userEvent.setup();
    const state = { ...investigationState(), revision: 3, inspectedItemIds: ["E3"] };
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    renderInvestigation(state);

    const question = screen.getByLabelText(/question for the source station/i);
    await user.type(question, "What changed on the road?");
    await user.click(screen.getByRole("button", { name: /ask source/i }));
    await user.clear(question);
    await user.type(question, "What could you actually know?");

    resolveFetch?.(
      Response.json({
        contractVersion: "1.1.0",
        caseId: "varennes",
        caseSchemaVersion: "1.0.0",
        caseVersion: "1.0.3",
        policyVersion: "1.0.1",
        stateVersion: "1.2.0",
        requestId: "00000000-0000-4000-8000-000000000001",
        stateRevision: 3,
        promptVersion: "character-turn-v1",
        status: "fallback",
        source: "deterministic_fallback",
        authority: "formative_only",
        mutatesCaseState: false,
        speechAuthorization: null,
        reason: "missing_api_key",
        retryable: false,
        turn: {
          spokenResponse: "This stale answer should never appear.",
          renderedUnitIds: ["CLAIM-DROUET-BRANCH-SUSPICION"],
          claimIds: ["CLAIM-DROUET-BRANCH-SUSPICION"],
          factIdsUsed: [],
          sourceIdsUsed: [],
          evidenceIdsReferenced: [],
          epistemicStatus: "observed",
          evidenceReaction: "not_presented",
          followUpQuestion: null,
        },
      }),
    );

    expect(await screen.findByDisplayValue("What could you actually know?")).toBeInTheDocument();
    expect(screen.queryByText(/stale answer should never appear/i)).toBeNull();
  });

  it("shows only station-authorized inspected evidence", async () => {
    const user = userEvent.setup();
    const state = {
      ...investigationState(),
      revision: 3,
      inspectedItemIds: ["E1", "E2", "E3"],
    };
    renderInvestigation(state);

    await user.click(screen.getByRole("button", { name: /Louis XVI station/i }));

    expect(screen.getByRole("option", { name: /E1 \/ Louis's declaration/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /E2/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /E3/i })).toBeNull();
  });
});
