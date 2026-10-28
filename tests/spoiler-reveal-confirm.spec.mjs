import { expect, test } from "@playwright/test";

// Local spec. It lives in tests/, not tests/preview/, and runs with the other
// local specs against the origin in BASE_URL. It does not run against a Vercel
// preview and does not call registerPreviewBypass.

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
const REAL_HEADLINE = "Celtics sealed the Tuesday recap";
const SAFE_HEADLINE = "Spoiler-protected headline from the wire";

const PROTECTION = {
  TT: {
    settings: { hideScores: true, hideHeadlines: true },
    label: "Spoilers hidden by default. Show scores and headlines by default",
    pressed: "true",
    dialog: "Show scores and headlines?",
    confirm: "Show scores and headlines",
  },
  TF: {
    settings: { hideScores: true, hideHeadlines: false },
    label: "Scores hidden by default. Show scores and headlines by default",
    pressed: "mixed",
    dialog: "Show scores?",
    confirm: "Show scores",
  },
  FT: {
    settings: { hideScores: false, hideHeadlines: true },
    label: "Headlines hidden by default. Show scores and headlines by default",
    pressed: "mixed",
    dialog: "Show headlines?",
    confirm: "Show headlines",
  },
  FF: {
    settings: { hideScores: false, hideHeadlines: false },
    label: "Spoilers shown by default. Hide scores and headlines by default",
    pressed: "false",
    dialog: null,
    confirm: null,
  },
};

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
    const story = {
      title: REAL_HEADLINE,
      safeTitle: SAFE_HEADLINE,
      link: "https://example.com/celtics-tuesday-recap",
      pubDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      source: "Wire",
      isSpoiler: true,
      category: "recap",
    };
    const feeds = Object.fromEntries(names.map((name) => [name, {
      items: name === "Celtics" ? [story] : [],
      error: false,
    }]));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feeds }),
    });
  });
});

function topButton(page, mode) {
  return protectionButton(page, mode === "hidden" ? "TT" : "FF");
}

function revealDialog(page, name = DIALOG_NAME) {
  return page.getByRole("dialog", { name, exact: true });
}

function protectionButton(page, key) {
  return page.getByRole("button", { name: PROTECTION[key].label, exact: true });
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

function mixedButton(page, hiddenPart) {
  return protectionButton(page, hiddenPart === "scores" ? "TF" : "FT");
}

async function openMixedDialog(page, key) {
  const state = PROTECTION[key];
  const button = protectionButton(page, key);
  await expect(button).toHaveAttribute("aria-pressed", "mixed");
  expect(await storedSettings(page)).toBe(JSON.stringify(state.settings));
  const overflowBefore = await bodyOverflow(page);
  await button.click();
  const dialog = revealDialog(page, state.dialog);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: state.confirm, exact: true })).toBeVisible();
  await expect(revealDialog(page, DIALOG_NAME)).toHaveCount(0);
  await expect.poll(() => bodyOverflow(page)).toBe("hidden");
  expect(await storedSettings(page)).toBe(JSON.stringify(state.settings));
  return { dialog, overflowBefore, state };
}

async function expectMixedKept(page, key, overflowBefore, { onHome = true } = {}) {
  const state = PROTECTION[key];
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await storedSettings(page)).toBe(JSON.stringify(state.settings));
  const button = protectionButton(page, key);
  await expect(button).toHaveAttribute("aria-pressed", "mixed");
  await expect(button).toBeFocused();
  await expect.poll(() => bodyOverflow(page)).toBe(overflowBefore);
  if (!onHome) {
    await expect(page.getByText(HOME_SCORE, { exact: true })).toHaveCount(0);
    await expect(page.getByText(AWAY_SCORE, { exact: true })).toHaveCount(0);
    return;
  }
  if (state.settings.hideScores) await expectScoreAbsent(page);
  else {
    await expect(homeScore(page)).toBeVisible();
    await expect(awayScore(page)).toBeVisible();
  }
  if (state.settings.hideHeadlines) {
    await expect(page.getByText(REAL_HEADLINE, { exact: true })).toHaveCount(0);
  }
}

function aboutLink(page) {
  return page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "About", exact: true });
}

async function bodyOverflow(page) {
  return page.evaluate(() => document.body.style.overflow);
}

async function openRevealDialog(page) {
  const overflowBefore = await bodyOverflow(page);
  await topButton(page, "hidden").click();
  const dialog = revealDialog(page);
  await expect(dialog).toBeVisible();
  await expect.poll(() => bodyOverflow(page)).toBe("hidden");
  expect(await storedSettings(page)).toBe(HIDDEN_JSON);
  return { dialog, overflowBefore };
}

async function expectClosedWithoutReveal(page, overflowBefore) {
  await expect(revealDialog(page)).toHaveCount(0);
  expect(await storedSettings(page)).toBe(HIDDEN_JSON);
  await expect(page.getByText(HOME_SCORE, { exact: true })).toHaveCount(0);
  await expect(page.getByText(AWAY_SCORE, { exact: true })).toHaveCount(0);
  await expect.poll(() => bodyOverflow(page)).toBe(overflowBefore);
  await expect(topButton(page, "hidden")).toBeFocused();
  await expect(topButton(page, "hidden")).toHaveAttribute("aria-pressed", "true");
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

for (const [hiddenPart, key] of [["scores", "TF"], ["headlines", "FT"]]) {
  test(`confirming from ${hiddenPart} hidden writes both flags false`, async ({ page }) => {
    const state = PROTECTION[key];
    await seedSettings(page, state.settings);
    await openHome(page);
    const { dialog } = await openMixedDialog(page, key);
    await dialog.getByRole("button", { name: state.confirm, exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(homeScore(page)).toBeVisible();
    await expect(awayScore(page)).toBeVisible();
    await expect(protectionButton(page, "FF")).toHaveAttribute("aria-pressed", "false");
    expect(await storedSettings(page)).toBe(SHOWN_JSON);
  });
}

for (const key of ["TT", "TF", "FT", "FF"]) {
  test(`protection control for ${key} uses its label and aria-pressed`, async ({ page }) => {
    const state = PROTECTION[key];
    await seedSettings(page, state.settings);
    await openHome(page);
    const button = protectionButton(page, key);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", state.pressed);
    if (key === "FF") await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("going back closes the reveal dialog without revealing", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await aboutLink(page).click();
  await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
  await page.getByRole("link", { name: "My NBA Feed home", exact: true }).click();
  await expect(games(page).getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  const { overflowBefore } = await openRevealDialog(page);

  await page.goBack();

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
  await expectClosedWithoutReveal(page, overflowBefore);
});

test("going forward closes the reveal dialog without revealing", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  await aboutLink(page).click();
  await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
  await page.goBack();
  await expect(games(page).getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
  const { overflowBefore } = await openRevealDialog(page);

  await page.goForward();

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
  await expectClosedWithoutReveal(page, overflowBefore);
});

test("history.pushState closes the reveal dialog without revealing", async ({ page }) => {
  await seedSettings(page, HIDDEN);
  await openHome(page);
  const { overflowBefore } = await openRevealDialog(page);

  // Next copies the current history state into pushState and applies the URL
  // there. The popstate event then restores that same tree, so the address
  // becomes /about while the home view stays mounted. The dialog still has to
  // dismiss without revealing.
  await page.evaluate(() => {
    history.pushState(null, "", "/about");
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  });

  await expect(page).toHaveURL(/\/about$/);
  await expectClosedWithoutReveal(page, overflowBefore);
});

for (const key of ["TF", "FT"]) {
  test(`Keep hidden from ${key} keeps the mixed setting`, async ({ page }) => {
    await seedSettings(page, PROTECTION[key].settings);
    await openHome(page);
    const { dialog, overflowBefore } = await openMixedDialog(page, key);
    await dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true }).click();
    await expectMixedKept(page, key, overflowBefore);
  });

  test(`Escape from ${key} keeps the mixed setting`, async ({ page }) => {
    await seedSettings(page, PROTECTION[key].settings);
    await openHome(page);
    const { dialog, overflowBefore } = await openMixedDialog(page, key);
    await expect(dialog.getByRole("button", { name: KEEP_HIDDEN, exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expectMixedKept(page, key, overflowBefore);
  });

  test(`backdrop click from ${key} keeps the mixed setting`, async ({ page }) => {
    await seedSettings(page, PROTECTION[key].settings);
    await openHome(page);
    const { dialog, overflowBefore } = await openMixedDialog(page, key);
    await clickBackdrop(page, dialog);
    await expectMixedKept(page, key, overflowBefore);
  });

  test(`going back from ${key} keeps the mixed setting`, async ({ page }) => {
    await seedSettings(page, PROTECTION[key].settings);
    await openHome(page);
    await aboutLink(page).click();
    await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
    await page.getByRole("link", { name: "My NBA Feed home", exact: true }).click();
    await expect(games(page).getByRole("heading", { name: "Last Game", exact: true })).toBeVisible();
    const { overflowBefore } = await openMixedDialog(page, key);
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: /Basketball/ })).toBeVisible();
    await expectMixedKept(page, key, overflowBefore, { onHome: false });
  });
}

test("confirming hidden headlines shows the redacted story", async ({ page }) => {
  await seedSettings(page, PROTECTION.FT.settings);
  await openHome(page);
  await page.getByText("Celtics, latest news", { exact: true }).click();
  await expect(page.getByText(REAL_HEADLINE, { exact: true })).toHaveCount(0);
  await expect(page.getByText(SAFE_HEADLINE, { exact: true })).toBeVisible();

  const { dialog } = await openMixedDialog(page, "FT");
  await dialog.getByRole("button", { name: PROTECTION.FT.confirm, exact: true }).click();

  await expect(page.getByText(REAL_HEADLINE, { exact: true })).toBeVisible();
  await expect(page.getByText(SAFE_HEADLINE, { exact: true })).toHaveCount(0);
  expect(await storedSettings(page)).toBe(SHOWN_JSON);
});
