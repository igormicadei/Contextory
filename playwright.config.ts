import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  workers: 3,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4317",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 360, height: 900 },
  },
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:4317/sidebar.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
