import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Supply a Playwright page, as with pages-regression.mjs; game data below is a fixture.
export default async function runArenaHomeRegression(page) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/teams.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  const teams = exports.teams;
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", error => errors.push(error.message));
  let state = "live";
  await p.route("**/api/games?**", route => {
    if (state === "error") return route.fulfill({ status: 503, json: { error: "unavailable" } });
    const team = teams.find(team => team.id === Number(new URL(route.request().url()).searchParams.get("teamId")));
    const opponent = teams.find(other => other.id !== team.id);
    const game = { id: 100, date: "2026-10-26", status: "Final", isHome: true, homeTeam: team, awayTeam: opponent, homeScore: 112, awayScore: 97 };
    return route.fulfill({ json: {
      lastGame: state === "empty" ? null : game,
      currentGame: state === "live" ? { ...game, id: 101, status: "2nd Qtr", homeScore: 48, awayScore: 41 } : null,
      nextGame: state === "future" ? { ...game, id: 102, date: "2026-11-02", startTime: "2026-11-03T00:30:00Z", status: "Scheduled", homeScore: 0, awayScore: 0 } : null,
      record: { wins: 2, losses: 1 }, error: null,
    } });
  });
  await p.route("**/api/news?**", route => route.fulfill({ json: { feeds: {} } }));
  const issues = [];
  try {
    await p.goto("http://localhost:3000");
    await p.getByRole("button", { name: "Reveal record", exact: true }).waitFor();
    await p.waitForTimeout(100);
    const entrance = await p.locator("main > section").evaluate(el => el.getAnimations({ subtree: true }).map(animation => ({ name: animation.animationName, iterations: animation.effect.getTiming().iterations })));
    assert.ok(entrance.some(animation => animation.name?.includes("arena-open")), "arena has its authored entrance");
    assert.ok(entrance.every(animation => animation.iterations === 1), "entrance does not loop");
    await p.waitForTimeout(4600);
    const crest = p.getByRole("button", { name: /Change focus team from/ });
    const crestBefore = await crest.boundingBox();
    await p.mouse.move(crestBefore.x + crestBefore.width / 2, crestBefore.y + crestBefore.height / 2);
    await p.mouse.down();
    await p.waitForTimeout(180);
    const crestPressed = await crest.boundingBox();
    assert.ok(Math.abs(crestBefore.x + crestBefore.width / 2 - crestPressed.x - crestPressed.width / 2) < 1, "pressed crest keeps its horizontal center");
    assert.ok(Math.abs(crestBefore.y + crestBefore.height / 2 - crestPressed.y - crestPressed.height / 2) < 1, "pressed crest keeps its vertical center");
    await p.mouse.up();
    await p.getByRole("dialog").waitFor();
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    assert.equal(await p.locator("main > section").evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length), 0);
    const seat = p.getByRole("link", { name: /Your courtside corner/ });
    await seat.focus();
    await p.waitForTimeout(350);
    assert.notEqual(await seat.locator("svg").first().evaluate(el => getComputedStyle(el).transform), "none", "basketball responds to keyboard focus");
    await p.keyboard.press("Enter");
    assert.equal(await p.locator("#home-games").evaluate(el => el === document.activeElement), true, "courtside link moves keyboard focus to games");
    await p.getByRole("link", { name: "Back to top", exact: true }).click();
    assert.ok(await p.locator("main > section img").first().evaluate(image => image.complete && image.naturalWidth > 0));
    assert.equal(await p.locator("main details").first().evaluate(el => el.open), false);
    await p.getByRole("button", { name: "Reveal Celtics result", exact: true }).click();
    assert.ok(await p.getByText("112", { exact: true }).isVisible());
    assert.ok(await p.getByRole("button", { name: "Reveal Celtics live score", exact: true }).isVisible(), "a result reveal keeps live scores hidden");
    await p.getByRole("button", { name: "Hide Celtics result", exact: true }).click();

    for (const width of [320, 390, 640, 768, 1024, 1200, 1280, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.getByRole("button", { name: "Reveal record", exact: true }).scrollIntoViewIfNeeded();
      const roster = p.getByRole("link", { name: "Celtics players", exact: true });
      const beforeReveal = await roster.boundingBox();
      const heroBefore = await p.locator("main > section").boundingBox();
      await p.getByRole("button", { name: "Reveal record", exact: true }).click();
      const record = await p.getByText("2-1", { exact: true }).boundingBox();
      const hideRecord = await p.getByRole("button", { name: "Hide record", exact: true }).boundingBox();
      assert.ok(Math.abs(record.y + record.height / 2 - hideRecord.y - hideRecord.height / 2) < 1, `${width}: record and hide action share a row`);
      assert.deepEqual(await roster.boundingBox(), beforeReveal, `${width}: revealing the record keeps roster controls stable`);
      assert.deepEqual(await p.locator("main > section").boundingBox(), heroBefore, `${width}: revealing the record keeps the hero stable`);
      await p.getByRole("button", { name: "Hide record", exact: true }).click();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no page overflow`);
      const targets = await p.locator("main button, main a, main summary").evaluateAll(elements => elements.filter(el => el.checkVisibility()).map(el => ({ text: el.textContent, height: el.getBoundingClientRect().height })));
      assert.ok(targets.every(target => target.height >= 44), `${width}: small target ${JSON.stringify(targets.filter(target => target.height < 44))}`);
    }

    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.reload();
    await p.waitForTimeout(200);
    assert.equal(await p.locator("main > section").evaluate(el => el.getAnimations({ subtree: true }).length), 0, "reduced motion is static");
    await seat.focus();
    assert.equal(await seat.locator("svg").first().evaluate(el => getComputedStyle(el).transform), "none", "reduced motion keeps the basketball still on focus");
    await p.setViewportSize({ width: 320, height: 844 });
    for (const team of teams) {
      await p.getByRole("button", { name: "Change focus team", exact: true }).click();
      await p.getByRole("button", { name: `${team.city} ${team.name}`, exact: true }).click();
      await p.getByRole("heading", { name: `${team.city} ${team.name}`, exact: true }).waitFor();
      assert.ok((await seat.textContent()).includes(team.name), "courtside welcome follows the focus team");
      const title = await p.locator("h1 span").last().evaluate(el => ({ text: el.textContent, height: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight), width: el.scrollWidth, available: el.clientWidth }));
      if (!team.name.includes(" ") && title.height > title.lineHeight * 1.2) issues.push(`${team.name}: split word`);
      if (title.width > title.available + 1) issues.push(`${team.name}: clipped title`);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${team.name}: page overflow`);
      assert.equal(await p.getByRole("link", { name: `${team.name} players`, exact: true }).getAttribute("href"), "/players");
    }
    assert.deepEqual(issues, [], "all 30 names fit at 320px");
    const catchUp = p.getByRole("region", { name: "Highlights and news", exact: true });
    const news = catchUp.locator(":scope > details");
    await news.locator(":scope > summary").focus();
    await p.keyboard.press("Enter");
    assert.equal(await news.evaluate(el => el.open), true, "news opens with the keyboard");
    await p.setViewportSize({ width: 1440, height: 1000 });
    assert.ok((await news.boundingBox()).width >= (await catchUp.boundingBox()).width * 0.95, "expanded reading uses the full width");
    await news.locator(":scope > summary").focus();
    await p.keyboard.press("Enter");
    assert.equal(await news.evaluate(el => el.open), false);
    const ending = await p.evaluate(() => ({ main: document.querySelector("main").getBoundingClientRect().bottom, footer: document.querySelector("footer").getBoundingClientRect().top }));
    assert.equal(await p.getByRole("contentinfo").count(), 1, "the shared footer is not duplicated on the homepage");
    assert.ok(Math.abs(ending.main - ending.footer) < 1, "shared footer follows content without a forced empty tail");
    await p.getByRole("link", { name: "Back to top", exact: true }).click();
    assert.ok(await p.evaluate(() => scrollY <= 2), "back to top returns to the page opening");
    for (const scenario of ["empty", "error", "future"]) {
      state = scenario;
      await p.reload();
      if (state === "error") {
        await p.getByText("Unable to load game data", { exact: true }).waitFor();
        state = "live";
        await p.getByRole("button", { name: "Try again", exact: true }).first().click();
        await p.getByRole("heading", { name: "Live Now", exact: true }).waitFor();
      } else if (state === "empty") {
        await p.getByText("No recent game found", { exact: true }).waitFor();
        await p.getByText("No upcoming game found", { exact: true }).waitFor();
      } else {
        await p.getByRole("heading", { name: "Next Game", exact: true }).waitFor();
      }
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scenario}: page overflow`);
    }
    assert.deepEqual(errors, []);
    return { result: "passed", viewports: 8, teams: 30, checks: "hero asset, one-shot entrance, reduced motion, touch targets, title fit, score scopes, roster access, optional full-width news, page ending/back-to-top, empty/error/retry/future games" };
  } finally { await context.close(); }
}
