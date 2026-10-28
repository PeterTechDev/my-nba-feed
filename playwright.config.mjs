import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.mjs",
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
