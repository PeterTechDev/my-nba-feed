import { expect, test } from "@playwright/test";

if (!process.env.BASE_URL) {
  throw new Error("Set BASE_URL to the origin of the running app.");
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

function watchPage(page) {
  const hydration = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/#418|Hydration|hydration/.test(text)) hydration.push(`${message.type()}: ${text}`);
    else if (message.type() === "error" && !isMissingKey503(message)) consoleErrors.push(text);
  });
  page.on("pageerror", (error) => {
    const text = error instanceof Error ? error.message : String(error);
    if (/#418|Hydration|hydration/.test(text)) hydration.push(`pageerror: ${text}`);
    else pageErrors.push(text);
  });
  return { hydration, consoleErrors, pageErrors };
}

// Chromium logs a failed fetch even when the app handles it. Without
// BALLDONTLIE_KEY, /api/games and /api/standings both respond 503
// "API key not configured". Those two resource errors are allowed.
function isMissingKey503(message) {
  const location = message.location()?.url ?? "";
  let path = "";
  try { path = new URL(location).pathname; } catch { path = ""; }
  return (path === "/api/games" || path === "/api/standings") && /\b503\b/.test(message.text());
}

function assertQuiet(record) {
  expect(record.hydration, record.hydration.join("\n")).toEqual([]);
  expect(record.pageErrors, record.pageErrors.join("\n")).toEqual([]);
  expect(record.consoleErrors, record.consoleErrors.join("\n")).toEqual([]);
}

test("home loads the team games without console or hydration errors", async ({ page }) => {
  const record = watchPage(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Boston Celtics", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Celtics games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();
  assertQuiet(record);
});

test("standings loads its heading and a conference, empty state, or the data error", async ({ page }) => {
  const record = watchPage(page);
  await page.goto("/standings");
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
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Boston Celtics", exact: true })).toBeVisible();
  await expect(page.getByText("Eastern Conference", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change focus team", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Celtics players", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Celtics Roster", exact: true })).toBeVisible();
  assertQuiet(record);
});

test("spoiler protection stays on after reload", async ({ page }) => {
  const record = watchPage(page);
  const hidden = page.getByRole("button", { name: /Spoilers hidden by default/ });
  const shown = page.getByRole("button", { name: /Spoilers shown by default/ });
  await page.goto("/");
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  await hidden.click();
  await expect(shown).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(shown).toHaveAttribute("aria-pressed", "false");
  await shown.click();
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(hidden).toHaveAttribute("aria-pressed", "true");
  assertQuiet(record);
});
