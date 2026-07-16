import { expect, test } from "@playwright/test";

test("primer does not overflow at the narrowest two-column viewport", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 900 });
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "France is in revolution" })).toBeVisible();

  const layout = await page.evaluate(() => ({
    overflows: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout).toEqual({ overflows: false, scrollWidth: 780, viewportWidth: 780 });
});
