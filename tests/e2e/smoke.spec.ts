import { expect, test } from "@playwright/test";

test("opens the Varennes case from the first screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "The Road That Should Have Closed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin investigation" })).toHaveAttribute(
    "href",
    "/play",
  );
});
