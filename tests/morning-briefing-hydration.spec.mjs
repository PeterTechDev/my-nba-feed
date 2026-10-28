import { expect, test } from "@playwright/test";

// Same call MorningBriefingCard makes after mount:
// new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })
const BRIEFING_DATE_FORMAT = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
};

function briefingLabel(date = new Date()) {
  return date.toLocaleDateString("en-US", BRIEFING_DATE_FORMAT);
}

if (!process.env.BASE_URL) {
  throw new Error("Set BASE_URL to the server origin, for example http://127.0.0.1:3000");
}

test.beforeEach(async ({ page, baseURL }) => {
  const bypass = process.env.VERCEL_BYPASS;
  if (!bypass || !baseURL) return;
  const appOrigin = new URL(baseURL).origin;
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== appOrigin) {
      await route.continue();
      return;
    }
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-protection-bypass": bypass,
      },
    });
  });
});

for (const timezoneId of ["America/Bahia", "UTC"]) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });

    test("Morning Briefing date appears after mount without a hydration error", async ({ page }) => {
      const hydration = [];
      const consoleErrors = [];
      const gamesStatuses = [];
      page.on("console", (message) => {
        const text = message.text();
        if (/#418|Hydration|hydration/.test(text)) hydration.push(`${message.type()}: ${text}`);
        else if (message.type() === "error") consoleErrors.push(text);
      });
      page.on("pageerror", (error) => {
        const text = error instanceof Error ? error.message : String(error);
        if (/#418|Hydration|hydration/.test(text)) hydration.push(`pageerror: ${text}`);
      });
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.pathname === "/api/games") gamesStatuses.push(response.status());
      });

      const labelBeforeGoto = briefingLabel();
      await page.goto("/");
      const labelAfterGoto = briefingLabel();
      await page.getByText("Celtics, latest news", { exact: true }).click();
      const heading = page.getByRole("heading", { name: "Morning Briefing", exact: true });
      await expect(heading).toBeVisible();
      const dateSlot = heading.locator("..");
      await expect(dateSlot.getByText(labelBeforeGoto, { exact: true }).or(dateSlot.getByText(labelAfterGoto, { exact: true }))).toBeVisible();
      expect(hydration, hydration.join("\n")).toEqual([]);

      const games503 = gamesStatuses.filter((status) => status === 503).length;
      if (games503 > 0 || consoleErrors.length > 0) {
        console.log(`note: ${timezoneId} /api/games 503 responses=${games503}; other console errors=${JSON.stringify(consoleErrors)}`);
      }
    });
  });
}
