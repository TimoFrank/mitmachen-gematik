import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4197);
export default defineConfig({
  testDir: "./tests",
  testMatch: "gematik-core-ui.spec.js",
  fullyParallel: true,
  timeout: 30000,
  expect: { timeout: 8000 },
  outputDir: process.env.GEMATIK_TEST_OUTPUT || "/tmp/vk-gematik-artifact-results",
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}`, timezoneId: "Europe/Berlin", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "chromium-mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: "API_BASE_URL=https://target.example.invalid npm run build:target && node scripts/serve_gematik_preview.mjs",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe"
  }
});
