import { describe, expect, it } from "vitest";

import {
  resolveDeployedBaseUrl,
  resolveDeployedRegressionConfiguration,
} from "../../playwright.deployed.config";

describe("deployed regression configuration", () => {
  it("accepts a normalized HTTPS deployment URL without a local web server", () => {
    expect(
      resolveDeployedBaseUrl({
        UNCHANGED_DEPLOYED_URL: "https://unchanged.vercel.app/",
      }),
    ).toBe("https://unchanged.vercel.app");

    expect(
      resolveDeployedRegressionConfiguration({
        UNCHANGED_DEPLOYED_URL: "https://unchanged.vercel.app/",
      }),
    ).toMatchObject({
      use: { baseURL: "https://unchanged.vercel.app" },
      webServer: undefined,
      globalSetup: "./tests/deployed/validate-deployed-target.ts",
      testDir: "./tests/deployed",
      testMatch: ["public-url-regression.spec.ts"],
    });
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "http://unchanged.vercel.app",
    "http://localhost:3000",
    "https://unchanged.vercel.app/with-a-path",
    "https://unchanged.vercel.app/?preview=1",
    "https://unchanged.vercel.app/#fragment",
  ])("rejects an unsafe or ambiguous deployed URL: %s", (value) => {
    expect(() =>
      resolveDeployedBaseUrl({ UNCHANGED_DEPLOYED_URL: value }),
    ).toThrow(/UNCHANGED_DEPLOYED_URL/);
  });
});
