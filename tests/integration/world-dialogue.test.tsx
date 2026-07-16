import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseSessionProvider, useCaseSession } from "@/components/case-session/case-session-provider";
import { CharacterConversationPanel } from "@/components/characters/character-conversation-panel";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { createInitialCaseState } from "@/lib/case-engine/state";
import type { BrowserSpeechAdapter } from "@/lib/voice/browser-speech";

const casePackage = loadVarennesCase();

function CaseStateProbe() {
  const { state } = useCaseSession();

  return (
    <output data-testid="case-state">
      {state.revision}:{state.inspectedItemIds.join(",")}:{state.pinnedEvidenceIds.join(",")}
    </output>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("world character dialogue", () => {
  it("sends Drouet only current authorized evidence and cannot issue a case command", async () => {
    const user = userEvent.setup();
    const state = {
      ...createInitialCaseState(casePackage),
      phase: "investigation" as const,
      revision: 7,
      inspectedItemIds: ["E1", "E3", "E4"],
    };
    let requestBody: Record<string, unknown> | undefined;
    const speak = vi.fn(async () => ({ status: "completed" as const }));
    const speechAdapter: BrowserSpeechAdapter = {
      isSupported: () => true,
      getStatus: () => "idle",
      speak,
      cancel: vi.fn(() => ({ status: "idle" as const })),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({
          contractVersion: requestBody.contractVersion,
          caseId: requestBody.caseId,
          caseSchemaVersion: requestBody.caseSchemaVersion,
          caseVersion: requestBody.caseVersion,
          policyVersion: requestBody.policyVersion,
          stateVersion: requestBody.stateVersion,
          requestId: requestBody.requestId,
          stateRevision: requestBody.stateRevision,
          promptVersion: requestBody.promptVersion,
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

    render(
      <CaseSessionProvider initialState={state} persist={false}>
        <CharacterConversationPanel
          speechAdapterFactory={() => speechAdapter}
          stationId="CHAR-DROUET"
        />
        <CaseStateProbe />
      </CaseSessionProvider>,
    );

    expect(screen.getByRole("option", { name: /E3 \/ Drouet's report/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /E4 \/ Route board/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /E1/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /E5/i })).toBeNull();

    await user.selectOptions(screen.getByLabelText(/present inspected evidence/i), "E3");
    await user.type(
      screen.getByLabelText(/question for the source station/i),
      "What changes when I compare this report with your branch?",
    );
    await user.click(screen.getByRole("button", { name: /ask source/i }));

    await waitFor(() => {
      expect(requestBody).toMatchObject({
        stationId: "CHAR-DROUET",
        inspectedEvidenceIds: ["E3", "E4"],
        presentedEvidenceIds: ["E3"],
        stateRevision: 7,
      });
    });
    expect(await screen.findByRole("article", { name: /source response/i })).toHaveTextContent(
      /verified historical report conflicts/i,
    );
    expect(screen.getByText(/ai-directed dramatization/i)).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic browser voice, not drouet's historical voice/i),
    ).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /hear response/i }));
    expect(speak).toHaveBeenCalledWith(
      "The verified historical report conflicts with my experience in this fictional branch.",
    );
    expect(screen.queryByRole("button", { name: /pin|record|repair|command/i })).toBeNull();
    expect(screen.getByTestId("case-state")).toHaveTextContent("7:E1,E3,E4:");
  });

  it("sends Louis only inspected E1 while preserving the declaration and private-motive boundary", async () => {
    const user = userEvent.setup();
    const state = {
      ...createInitialCaseState(casePackage),
      phase: "investigation" as const,
      revision: 11,
      inspectedItemIds: ["E1", "E2", "E3", "E4", "E5"],
    };
    let requestBody: Record<string, unknown> | undefined;
    const spokenResponse =
      "That declaration records my public description of the departure as purposeful. It cannot independently establish every private motive I held.";
    const speak = vi.fn(async () => ({ status: "completed" as const }));
    const speechAdapter: BrowserSpeechAdapter = {
      isSupported: () => true,
      getStatus: () => "idle",
      speak,
      cancel: vi.fn(() => ({ status: "idle" as const })),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({
          contractVersion: requestBody.contractVersion,
          caseId: requestBody.caseId,
          caseSchemaVersion: requestBody.caseSchemaVersion,
          caseVersion: requestBody.caseVersion,
          policyVersion: requestBody.policyVersion,
          stateVersion: requestBody.stateVersion,
          requestId: requestBody.requestId,
          stateRevision: requestBody.stateRevision,
          promptVersion: requestBody.promptVersion,
          status: "ok",
          source: "model",
          authority: "formative_only",
          mutatesCaseState: false,
          speechAuthorization: null,
          turn: {
            spokenResponse,
            renderedUnitIds: ["REACTION-LOUIS-E1-QUALIFY"],
            claimIds: [],
            factIdsUsed: ["F-S1-002", "F-S1-004"],
            sourceIdsUsed: ["S1"],
            evidenceIdsReferenced: ["E1"],
            epistemicStatus: "inferred",
            evidenceReaction: "qualified",
            followUpQuestion: "What does the declaration claim, and what can it not prove?",
          },
        });
      }),
    );

    render(
      <CaseSessionProvider initialState={state} persist={false}>
        <CharacterConversationPanel
          speechAdapterFactory={() => speechAdapter}
          stationId="CHAR-LOUIS"
        />
        <CaseStateProbe />
      </CaseSessionProvider>,
    );

    const caseStateBefore = screen.getByTestId("case-state").textContent;
    expect(caseStateBefore).toBe("11:E1,E2,E3,E4,E5:");
    expect.soft(
      screen.queryByText(
        /(?:public|stated) declaration.*(?:cannot|does not).*complete private motive/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /E1 \/ Louis's declaration/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /E2/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /E3/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /E4/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /E5/i })).toBeNull();

    await user.selectOptions(screen.getByLabelText(/present inspected evidence/i), "E1");
    await user.type(
      screen.getByLabelText(/question for the source station/i),
      "What does your declaration say publicly, and what can it prove about private motive?",
    );
    await user.click(screen.getByRole("button", { name: /ask source/i }));

    await waitFor(() => {
      expect(requestBody).toMatchObject({
        stationId: "CHAR-LOUIS",
        inspectedEvidenceIds: ["E1"],
        presentedEvidenceIds: ["E1"],
        stateRevision: 11,
      });
    });
    expect(await screen.findByRole("article", { name: /source response/i })).toHaveTextContent(
      /public description.*private motive/i,
    );
    expect(screen.getByText(/ai-directed dramatization/i)).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic browser voice, not louis xvi's historical voice/i),
    ).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /hear response/i }));
    expect(speak).toHaveBeenCalledWith(spokenResponse);
    expect(screen.queryByRole("button", { name: /record|pin|repair/i })).toBeNull();
    expect(screen.getByTestId("case-state").textContent).toBe(caseStateBefore);
  });
});
