import { expect, test } from "@playwright/test";

const investigationState = {
  persistenceVersion: "1.2.0",
  savedAt: "2026-07-14T12:00:00.000Z",
  state: {
    stateVersion: "1.2.0",
    caseId: "varennes",
    caseSchemaVersion: "1.0.0",
    caseVersion: "1.0.3",
    revision: 2,
    phase: "investigation",
    completedCommandIds: ["to-fracture", "to-investigation"],
    inspectedItemIds: [],
    completedComparisonIds: [],
    rejectedAnomalyIds: [],
    activeAnomalyId: null,
    pinnedEvidenceIds: [],
    selectedConditionIds: [],
    placedCausalNodeIds: [],
    connectedCausalEdgeIds: [],
    completedRepairActionIds: [],
    completedRepairStepIds: [],
    caseBrief: {
      argument: "",
      selectedConsequenceId: null,
      selectedUncertaintyIds: [],
      submitted: false,
    },
    repairCompleted: false,
  },
};

test("investigation route does not overflow a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript((savedState) => {
    window.localStorage.setItem("history-unbroken:varennes:state", JSON.stringify(savedState));
  }, investigationState);

  await page.goto("/play/investigate");
  await expect(page.getByRole("heading", { name: "Find the broken link." })).toBeVisible();

  const layout = await page.evaluate(() => ({
    overflows: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 60) ?? "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }))
      .filter((element) => element.left < 0 || element.right > window.innerWidth)
      .slice(0, 10),
  }));
  expect(layout).toEqual({
    overflows: false,
    scrollWidth: 320,
    viewportWidth: 320,
    offenders: [],
  });
});
