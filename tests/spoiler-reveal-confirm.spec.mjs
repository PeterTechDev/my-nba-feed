import { expect, test } from "@playwright/test";

// Same contract as the Playwright config on cursor/pet-30-automated-tests-f72a:
// testDir is tests/, and use.baseURL is process.env.BASE_URL. Paths stay relative.
// tests/preview-bypass.mjs is not imported. That helper is not on this branch, and
// a localhost origin does not need a Vercel protection bypass, so this file loads
// unchanged before and after the helper lands on main.
// The filename is *.spec.mjs, so node --test "tests/**/*.test.mjs" (npm test on
// that branch) does not execute it. Playwright's testMatch on that branch is an
// allowlist of morning-briefing-hydration.spec.mjs and smoke-pages.spec.mjs;
// `npm run test:e2e` collects this file once that allowlist includes this name.

if (!process.env.BASE_URL) {
  throw new Error("Set BASE_URL to the origin of the running app.");
}

const STORAGE_KEY = "nba-feed-spoiler-settings";
const HIDDEN = { hideScores: true, hideHeadlines: true };
const SHOWN = { hideScores: false, hideHeadlines: false };
const HIDDEN_JSON = JSON.stringify(HIDDEN);
const SHOWN_JSON = JSON.stringify(SHOWN);
const HOME_SCORE = "118";
const AWAY_SCORE = "107";
const GAMES_REGION = "Celtics games";
const DIALOG_NAME = "Show scores and headlines?";
const KEEP_HIDDEN = "Keep hidden";
const CONFIRM = "Show scores and headlines";
const FOCUSABLE = [KEEP_HIDDEN, CONFIRM];

const FINAL_GAME = {
  lastGame: {
    id: 9001,
    date: "2026-10-26",
    status: "Final",
    isHome: true,
    won: true,
    homeTeam: { id: 2, name: "Celtics", abbreviation: "BOS" },
    awayTeam: { id: 5, name: "Bulls", abbreviation: "CHI" },
    homeScore: 118,
    awayScore: 107,
  },
  currentGame: null,
  nextGame: null,
  record: { wins: 3, losses: 2 },
  error: null,
};

test.use({ viewport: { width: 1280, height: 720 } });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/games**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/games") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FINAL_GAME),
    });
  });
  await page.route("**/api/news**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/news") {
      await route.continue();
      return;
    }
    const names = (url.searchParams.get("teams") || url.searchParams.get("team") || "Celtics").split(",").filter(Boolean);
    const feeds = Object.fromEntries(names.map((name) => [name, { items: [], error: false }]));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feeds }),
    });
  });
});

function topButton(page, mode) {
  const name = mode === "hidden"
    ? "Spoilers hidden by default. Show scores and headlines by default"
    : "Spoilers shown by default. Hide scores and headlines by default";
  return page.getByRole("button", { name, exact: true });
}

function revealDialog(page) {
  return page.getByRole("dialog", { name: DIALOG_NAME, exact: true });
}

function games(page) {
  return page.getByRole("region", { name: GAMES_REGION });
}

function homeScore(page) {
  return games(page).getByText(HOME_SCORE, { exact: true });
}

function awayScore(page) {
  return games(page).getByText(AWAY_SCORE, { exact: true });
}

async function seedSettings(page, settings, { persistAcrossReload = false } = {}) {
  await page.addInitScript(({ key, value, persistAcrossReload }) => {
    const marker = "pet22-spoiler-settings-seeded";
    if (persistAcrossReload && sessionStorage.getItem(marker) === "1") return;
    localStorage.setItem(key, value);
    if (persistAcrossReload) sessionStorage.setItem(marker, "1");
  }, { key: STORAGE_KEY, value: JSON.stringify(settings), persistAcrossReload });
}

async function storedSettings(page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function openHome(page) {
  await page.goto("/");
  await expect(games(page).getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
}

async function expectScoreAbsent(page) {
  await expect(homeScore(page)).toHaveCount(0);
  await expect(awayScore(page)).toHaveCount(0);
  await expect(page.getByText(HOME_SCORE, { exact: true })).toHaveCount(0);
  await expect(page.getByText(AWAY_SCORE, { exact: true })).toHaveCount(0);
  await expect(games(page).getByRole("button", { name: "Reveal Celtics result", exact: true })).toBeVisible();
}

async function expectStillHidden(page) {
  await expectScoreAbsent(page);
  await expect(topButton(page, "hidden")).toHaveAttribute("aria-pressed", "true");
  expect(await storedSettings(page)).toBe(HIDDEN_JSON);
}

async function armTextWatch(page, values) {
  await page.evaluate((needles) => {
    const seen = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const value = (node.nodeValue || "").trim();
        if (needles.includes(value)) return true;
        node = walker.nextNode();
      }
      return false;
    };
    window.__pet22TextSeen = seen();
    const observer = new MutationObserver(() => {
      if (seen()) window.__pet22TextSeen = true;
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }, values);
}

async function armDialogWatch(page) {
  await page.evaluate(() => {
    const present = () => document.querySelector("dialog") !== null;
    window.__pet22DialogSeen = present();
    const observer = new MutationObserver(() => {
      if (present()) window.__pet22DialogSeen = true;
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
  });
}

async function clickBackdrop(page, dialog) {
  const box = await dialog.boundingBox();
  expect(box, "reveal dialog has a box to click outside").not.toBeNull();
  const x = Math.max(2, box.x - 12);
  const y = box.y + Math.min(box.height / 2, 40);
  expect(x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height).toBe(true);
  await page.mouse.click(x, y);
}

async function focusedInDialog(dialog) {
  return dialog.evaluate((node) => {
    const active = document.activeElement;
    const text = active instanceof HTMLElement
      ? (active.innerText || active.textContent || "").replace(/\s+/g, " ").trim()
      : "";
    return {
      inside: active instanceof Node && node.contains(active) && active !== node,
      text,
    };
  });
}

test("hidden spoilers open a named dialog and do not reveal the score", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await expectStillHidden(page);
  await armTextWatch(page, [HOME_SCORE, AWAY_SCORE]);

  await topButton(page, "hidden").click();

  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: CONFIRM, exact: true })).toBeVisible();
  await expectStillHidden(page);
  expect(await page.evaluate(() => window.__pet22TextSeen)).toBe(false);
});

test("Keep hidden closes the dialog and returns focus to the top button", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await expect(topButton(page, "hidden")).toBeFocused();
  await expectStillHidden(page);
});

test("Escape closes the dialog and returns focus to the top button", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true })).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(topButton(page, "hidden")).toBeFocused();
  await expectStillHidden(page);
});

test("backdrop click closes the dialog and returns focus to the top button", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();

  await clickBackdrop(page, dialog);

  await expect(dialog).toHaveCount(0);
  await expect(topButton(page, "hidden")).toBeFocused();
  await expectStillHidden(page);
});

test("confirming reveals the score and keeps it after reload", async ({ page }) => {
  await seedSettings(page, HIDDEN, { persistAcrossReload: true });
  await openHome(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();
  expect(await storedSettings(page)).toBe(HIDDEN_JSON);

  await dialog.getByRole("button", { name: CONFIRM, exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await expect(homeScore(page)).toBeVisible();
  await expect(awayScore(page)).toBeVisible();
  await expect(topButton(page, "shown")).toHaveAttribute("aria-pressed", "false");
  expect(await storedSettings(page)).toBe(SHOWN_JSON);

  await page.reload();
  await expect(games(page).getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  await expect(homeScore(page)).toBeVisible();
  await expect(awayScore(page)).toBeVisible();
  await expect(topButton(page, "shown")).toHaveAttribute("aria-pressed", "false");
  expect(await storedSettings(page)).toBe(SHOWN_JSON);
  await expect(revealDialog(page)).toHaveCount(0);
});

test("hiding again does not ask for confirmation and removes the score", async ({ page }) => {
  await seedSettings(page, SHOWN);
  await openHome(page);
  await expect(homeScore(page)).toBeVisible();
  await expect(awayScore(page)).toBeVisible();
  await expect(topButton(page, "shown")).toHaveAttribute("aria-pressed", "false");
  expect(await storedSettings(page)).toBe(SHOWN_JSON);
  await expect(revealDialog(page)).toHaveCount(0);
  await armDialogWatch(page);

  await topButton(page, "shown").click();

  await expect(revealDialog(page)).toHaveCount(0);
  await expectScoreAbsent(page);
  await expect(topButton(page, "hidden")).toHaveAttribute("aria-pressed", "true");
  expect(await storedSettings(page)).toBe(HIDDEN_JSON);
  expect(await page.evaluate(() => window.__pet22DialogSeen)).toBe(false);
});

test("Tab and Shift+Tab cycle only inside the reveal dialog", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true })).toBeFocused();

  await expect(dialog.getByRole("link")).toHaveCount(0);
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  const focusable = (await dialog.getByRole("button").allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  expect(focusable).toEqual(FOCUSABLE);

  const laps = 3;
  for (let step = 0; step < focusable.length * laps; step += 1) {
    await page.keyboard.press("Tab");
    const expected = focusable[(step + 1) % focusable.length];
    await expect.poll(() => focusedInDialog(dialog), { message: `Tab lap step ${step}` }).toEqual({ inside: true, text: expected });
  }

  for (let step = 0; step < focusable.length * laps; step += 1) {
    await page.keyboard.press("Shift+Tab");
    const expected = focusable[(focusable.length - ((step + 1) % focusable.length)) % focusable.length];
    await expect.poll(() => focusedInDialog(dialog), { message: `Shift+Tab lap step ${step}` }).toEqual({ inside: true, text: expected });
  }

  await expectStillHidden(page);
  await expect(dialog).toBeVisible();
});
