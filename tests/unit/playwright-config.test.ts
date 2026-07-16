import { describe, expect, it } from "vitest";

import { resolvePlaywrightWebServerEnv } from "../../playwright.config";

describe("Playwright web server environment", () => {
  it("strips an inherited OpenAI key by default", () => {
    const resolved = resolvePlaywrightWebServerEnv({
      OPENAI_API_KEY: "not-a-real-key",
    });

    expect(resolved).toEqual({ OPENAI_API_KEY: "" });
  });

  it("inherits an OpenAI key only for the explicit live smoke opt-in", () => {
    const resolved = resolvePlaywrightWebServerEnv({
      HISTORY_UNBROKEN_LIVE_OPENAI_SMOKE: "1",
      OPENAI_API_KEY: "not-a-real-key",
    });

    expect(resolved).toEqual({ OPENAI_API_KEY: "not-a-real-key" });
  });
});
