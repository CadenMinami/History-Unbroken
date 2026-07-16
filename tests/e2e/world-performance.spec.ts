import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { evaluateArchivePerformance } from "../../lib/world/performance-gate";
import {
  applyClassroomPerformanceProfile,
  CLASSROOM_PERFORMANCE_PROFILE,
  createTransferTracker,
  installArchiveInvestigationState,
  readWorldRenderWindow,
  resetWorldRenderSamples,
  runArchiveMovementLoop,
} from "./helpers/performance-profile";

test.use({ viewport: { width: 1366, height: 768 } });
test.setTimeout(140_000);

async function canvasColorCount(screenshot: Buffer): Promise<number> {
  const { data: pixels, info } = await sharp(screenshot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const colors = new Set<string>();
  const pixelStride = Math.max(
    1,
    Math.floor((info.width * info.height) / 3_000),
  );
  for (
    let pixel = 0;
    pixel < info.width * info.height;
    pixel += pixelStride
  ) {
    const index = pixel * info.channels;
    colors.add(`${pixels[index]}:${pixels[index + 1]}:${pixels[index + 2]}`);
  }
  return colors.size;
}

test("keeps the first interactive archive within the classroom proxy budget", async ({
  baseURL,
  page,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await installArchiveInvestigationState(page);
  const cdp = await applyClassroomPerformanceProfile(page);
  const transfers = createTransferTracker(cdp, baseURL);

  await page.goto("/play/world", { waitUntil: "domcontentloaded" });

  const prompt = page.getByRole("button", {
    name: /inspect drouet account table/i,
  });
  await expect(prompt).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Graphics quality: classroom")).toBeVisible();
  await prompt.click();
  await expect(
    page.getByRole("dialog", {
      name: /drouet's report to the national assembly/i,
    }),
  ).toBeVisible();

  const interactiveMs = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: /close evidence/i }).click();
  await page.waitForLoadState("networkidle");
  const initialCompressedBytes = transfers.totalEncodedBytes();

  const canvas = page.getByTestId("world-canvas").locator("canvas");
  const beforeColorCount = await canvasColorCount(await canvas.screenshot());

  await page.waitForTimeout(10_000);
  const frameWindowStartedAt = await resetWorldRenderSamples(page);
  const movementMetrics = await runArchiveMovementLoop(page, 60_000);
  const frameMetrics = await readWorldRenderWindow(
    page,
    frameWindowStartedAt,
    60_000,
  );
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText(
    /reconstruction ready/i,
  );
  const afterColorCount = await canvasColorCount(await canvas.screenshot());
  const canvasNonBlank = beforeColorCount > 20 && afterColorCount > 20;
  expect(movementMetrics.maxDistanceFromStart).toBeGreaterThan(0.5);

  const result = evaluateArchivePerformance({
    canvasNonBlank,
    initialCompressedBytes,
    interactiveMs,
    maxPostLoadStallMs: frameMetrics.maxStallMs,
    medianFps: frameMetrics.medianFps,
    p10Fps: frameMetrics.p10Fps,
  });

  await test.info().attach("archive-performance-report", {
    body: JSON.stringify(
      {
        ...result,
        browserVersion: page.context().browser()?.version() ?? "unknown",
        frameBuckets: frameMetrics.oneSecondFps,
        movement: movementMetrics,
        profile: CLASSROOM_PERFORMANCE_PROFILE,
        viewport: { height: 768, width: 1366 },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  console.log(
    `ARCHIVE_PERFORMANCE_REPORT ${JSON.stringify({
      ...result,
      browserVersion: page.context().browser()?.version() ?? "unknown",
      frameBuckets: frameMetrics.oneSecondFps,
      movement: movementMetrics,
      profile: CLASSROOM_PERFORMANCE_PROFILE,
      viewport: { height: 768, width: 1366 },
    })}`,
  );

  expect(result.failures, JSON.stringify(result, null, 2)).toEqual([]);
});
