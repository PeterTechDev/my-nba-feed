import { defineConfig } from "@playwright/test";

const bypass = process.env.VERCEL_BYPASS;

export default defineConfig({
  testDir: "tests",
  testMatch: "morning-briefing-hydration.spec.mjs",
  outputDir: "/tmp/morning-briefing-playwright-output",
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass } : {},
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
