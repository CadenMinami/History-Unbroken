import { defineConfig, devices } from "@playwright/test";

const e2ePort = 3100;
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const requiresFreshProductionServer =
  process.env.HISTORY_UNBROKEN_PERFORMANCE === "1";

interface PlaywrightWebServerSourceEnv {
  HISTORY_UNBROKEN_LIVE_OPENAI_SMOKE?: string;
  OPENAI_API_KEY?: string;
}

export function resolvePlaywrightWebServerEnv(
  environment: Readonly<PlaywrightWebServerSourceEnv>,
): { OPENAI_API_KEY: string } {
  return {
    OPENAI_API_KEY:
      environment.HISTORY_UNBROKEN_LIVE_OPENAI_SMOKE === "1"
        ? environment.OPENAI_API_KEY ?? ""
        : "",
  };
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: requiresFreshProductionServer ? 0 : process.env.CI ? 2 : 0,
  testIgnore: requiresFreshProductionServer
    ? []
    : ["**/world-performance.spec.ts"],
  reporter: "html",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${e2ePort}`,
    env: resolvePlaywrightWebServerEnv({
      HISTORY_UNBROKEN_LIVE_OPENAI_SMOKE:
        process.env.HISTORY_UNBROKEN_LIVE_OPENAI_SMOKE,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    }),
    url: e2eBaseUrl,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
