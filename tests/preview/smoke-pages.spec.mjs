import { expect, test } from "@playwright/test";
import { registerPreviewBypass } from "../preview-bypass.mjs";
import { isTolerated503 } from "../smoke-console.mjs";

// SMOKE_ALLOW_MISSING_API_KEY=1 tolerates a 503 console line only for the exact
// paths /api/games, /api/standings, and /api/digest. /api/digest/feedback is not
// included. Empty or unset, any 503 fails the smoke. The workflow reads the
// repository variable of the same name; it does not hardcode 1.
// VERCEL_BYPASS is required when BASE_URL is not localhost.

if (!process.env.BASE_URL) {
  throw new Error("Set BASE_URL to the origin of the running app.");
}

registerPreviewBypass();

function watchPage(page) {
  const hydration = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/#418|Hydration|hydration/.test(text)) hydration.push(`${message.type()}: ${text}`);
    else if (message.type() === "error" && !isTolerated503(message)) consoleErrors.push(text);
  });
  page.on("pageerror", (error) => {
    const text = error instanceof Error ? error.message : String(error);
    if (/#418|Hydration|hydration/.test(text)) hydration.push(`pageerror: ${text}`);
    else pageErrors.push(text);
  });
  return { hydration, consoleErrors, pageErrors };
}

function assertQuiet(record) {
  expect(record.hydration, record.hydration.join("\n")).toEqual([]);
  expect(record.pageErrors, record.pageErrors.join("\n")).toEqual([]);
  expect(record.consoleErrors, record.consoleErrors.join("\n")).toEqual([]);
}

const SCORE = /\d{2,3}\s*[-–]\s*\d{2,3}/;

test("home loads the team games without console or hydration errors", async ({ page }) => {
  const record = watchPage(page);
  const games = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/games");
  await page.goto("/");
  await games;
  await expect(page.getByRole("heading", { name: "Boston Celtics", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Celtics games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();
  assertQuiet(record);
});

test("standings loads its heading and a conference, empty state, or the data error", async ({ page }) => {
  const record = watchPage(page);
  const standings = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/standings");
  await page.goto("/standings");
  await standings;
  await expect(page.getByRole("heading", { name: "Standings", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Eastern Conference", exact: true })
      .or(page.getByRole("alert").filter({ hasText: "Unable to load standings" }))
      .or(page.getByText("No standings data available", { exact: true })),
  ).toBeVisible();
  assertQuiet(record);
});

test("the team header names the Celtics and opens their roster", async ({ page }) => {
  const record = watchPage(page);
  const games = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/games");
  await page.goto("/");
  await games;
  await expect(page.getByRole("heading", { name: "Boston Celtics", exact: true })).toBeVisible();
  await expect(page.getByText("Eastern Conference", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change focus team", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Celtics players", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Celtics Roster", exact: true })).toBeVisible();
  assertQuiet(record);
});

test("spoiler protection hides the score and stays on after reload", async ({ page }) => {
  const record = watchPage(page);
  await page.route("**/api/games?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lastGame: {
          id: 1, date: "2026-10-26", status: "Final", isHome: true, won: true,
          homeTeam: { id: 2, name: "Celtics", abbreviation: "BOS" },
          awayTeam: { id: 5, name: "Bulls", abbreviation: "CHI" },
          homeScore: 118, awayScore: 107,
        },
        currentGame: null, nextGame: null, record: { wins: 1, losses: 0 }, error: null,
      }),
    });
  });
  const hidden = page.getByRole("button", { name: /Spoilers hidden by default/ });
  const shown = page.getByRole("button", { name: /Spoilers shown by default/ });
  const games = page.getByRole("region", { name: "Celtics games" });
  const score = () => games.getByText(SCORE);
  await page.goto("/");
  await expect(games.getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  await expect(score()).toHaveCount(0);
  await hidden.click();
  const confirmation = page.getByRole("dialog", { name: "Show scores and headlines?", exact: true });
  await expect(shown.or(confirmation)).toBeVisible();
  if (await confirmation.isVisible()) {
    await confirmation.getByRole("button", { name: "Show scores and headlines", exact: true }).click();
  }
  await expect(shown).toHaveAttribute("aria-pressed", "false");
  await expect(score().first()).toBeVisible();
  await page.reload();
  await expect(games.getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  await expect(shown).toHaveAttribute("aria-pressed", "false");
  await expect(score().first()).toBeVisible();
  await shown.click();
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  await expect(score()).toHaveCount(0);
  await page.reload();
  await expect(games.getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  await expect(score()).toHaveCount(0);
  assertQuiet(record);
});
