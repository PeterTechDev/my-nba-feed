import { expect, test } from "@playwright/test";

// The reset is not a pure function. HomeDigestCard puts the My Teams ids in
// ScoreReveal's scope, and ScoreReveal remounts ProtectedScore when that key
// changes. This spec drives that component path against `next start`.
// Retries stay at 0. No fixed sleeps: locators wait on role and text.
test.use({
  baseURL: process.env.DIGEST_BASE_URL ?? "http://127.0.0.1:3311",
  channel: "chrome",
});
test.describe.configure({ retries: 0, timeout: 30_000 });

const DIGEST = {
  digest: {
    date: "2026-10-27",
    style: "analytical",
    title: "NBA Morning Briefing: 2026-10-27",
    content: "League date: 2026-10-26\nCeltics are 29-15.",
    games_covered: ["BKN 110-121 BOS", "MIA 99-110 NYK"],
    stats_highlighted: [],
    metadata: { model: "test", generation_time_ms: 1 },
    created_at: "2026-10-27T12:00:00.000Z",
  },
  isToday: true,
};

const SCORE = "O Boston Celtics venceu o Brooklyn Nets por 121 a 110.";

test("revealing the home digest hides again when My Teams changes", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/digest")) {
      await route.fulfill({ json: DIGEST });
      return;
    }
    if (url.includes("/api/games")) {
      await route.fulfill({ json: { lastGame: null, currentGame: null, nextGame: null, record: { wins: 29, losses: 15 }, error: null } });
      return;
    }
    if (url.includes("/api/news")) {
      await route.fulfill({ json: { feeds: {}, error: null } });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto("/");
  const reveal = page.getByRole("button", { name: "Revelar resultados do digest" });
  await expect(reveal).toBeVisible();
  await expect(page.getByText(SCORE)).toHaveCount(0);
  await expect(page.getByText("29-15")).toHaveCount(0);

  await reveal.click();
  await expect(page.getByRole("button", { name: "Ocultar resultados do digest" })).toBeVisible();
  await expect(page.getByText(SCORE)).toBeVisible();
  await expect(page.getByText("29-15")).toHaveCount(0);
  await expect(page.getByText("Campanha")).toHaveCount(0);

  await page.getByRole("button", { name: /My Teams/ }).click();
  const dialog = page.getByRole("dialog", { name: "My Teams" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Brooklyn Nets" }).click();
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("button", { name: "Revelar resultados do digest" })).toBeVisible();
  await expect(page.getByText(SCORE)).toHaveCount(0);
});
