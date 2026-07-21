import { expect, test } from "@playwright/test";

const commandCount = 26;
const caseBriefState = {
  persistenceVersion: "1.2.0",
  savedAt: "2026-07-14T12:00:00.000Z",
  state: {
    stateVersion: "1.2.0",
    caseId: "varennes",
    caseSchemaVersion: "1.0.0",
    caseVersion: "1.0.3",
    revision: commandCount,
    phase: "case_brief",
    completedCommandIds: Array.from({ length: commandCount }, (_, index) => `setup-${index}`),
    inspectedItemIds: ["E1", "E2", "E3", "E4", "E5", "E7", "E6A", "E6B", "E6C", "FO1", "FO2", "FO3"],
    completedComparisonIds: ["CMP-REJECT-E6A", "CMP-SUPPORT-E6B", "CMP-REJECT-E6C"],
    rejectedAnomalyIds: ["E6A", "E6C"],
    activeAnomalyId: "E6B",
    pinnedEvidenceIds: ["E1", "E2", "E3", "E5", "E7"],
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

test("caseboard uses a task flow without overflowing a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript((savedState) => {
    window.localStorage.setItem("unchanged:varennes:state", JSON.stringify(savedState));
  }, caseBriefState);

  await page.goto("/play/caseboard");
  await expect(page.getByRole("heading", { name: "Build one defensible explanation." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to archive" })).toBeVisible();
  await page.getByRole("button", { name: /select condition:/i }).first().click();
  await page.getByRole("button", { name: /^place /i }).first().click();

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
