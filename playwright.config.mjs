import { defineConfig } from "@playwright/test";

// PLAYWRIGHT_PREVIEW=1 is the preview job. It runs only tests/preview.
// Top-level specs, including future ones outside that directory, stay local.
const previewOnly = process.env.PLAYWRIGHT_PREVIEW === "1";

export default defineConfig({
  testDir: "tests",
  testMatch: previewOnly ? "preview/**/*.spec.mjs" : "**/*.spec.mjs",
  outputDir: "test-results",
  retries: 0,
  reporter: "line",
  use: {
    baseURL: process.env.BASE_URL,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
