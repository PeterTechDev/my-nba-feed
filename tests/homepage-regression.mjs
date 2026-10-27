// Run this default export with a Playwright page and the local app on port 3000.
export default async function runHomepageRegression(page) {
  const context = await page.context().browser().newContext({ timezoneId: "America/Bahia" });
  const p = await context.newPage();
  const passed = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    passed.push(message);
  };
  const requests = {};
  const team = { id: 2, name: "Celtics", abbreviation: "BOS" };
  const opponent = { id: 3, name: "Nets", abbreviation: "BKN" };
  const game = { id: 1, date: "2026-10-26", status: "Final", homeTeam: team, awayTeam: opponent, homeScore: 118, awayScore: 107, isHome: true, won: true };
  const next = { ...game, id: 2, date: "2026-10-27", startTime: "2026-10-27T23:30:00Z", status: "2026-10-27T23:30:00Z", homeScore: 0, awayScore: 0, won: undefined };
  let live = false;
  let failGames = false;
  let headline = "Shared news headline";
  await p.route("http://localhost:3000/api/**", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname + url.search;
    requests[key] = (requests[key] || 0) + 1;
    let data;
    if (url.pathname === "/api/games") {
      data = { lastGame: game, nextGame: live ? null : next, currentGame: live ? { ...next, status: "1st Qtr", homeScore: 24, awayScore: 20 } : null, record: { wins: 1, losses: 0 } };
      if (failGames) data = { error: "Temporarily unavailable" };
    } else data = Array.from({ length: 4 }, (_, i) => ({ title: headline + i, safeTitle: headline + i, isSpoiler: false, category: "analysis", pubDate: "2026-10-27T09:00:00Z", link: "https://example.com/" + i }));
    await route.fulfill({ status: failGames && url.pathname === "/api/games" ? 503 : 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  const count = (url) => requests[url] || 0;
  try {
    await p.clock.install({ time: new Date("2026-10-27T10:00:00Z") });
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.goto("http://localhost:3000/");
    await p.getByRole("link", { name: "Matchup context" }).waitFor();
    await p.getByText(headline + "0", { exact: true }).first().waitFor();
    check(count("/api/news?team=Celtics") === 1, "Morning Briefing and News share one request");
    check(count("/api/games?teamId=2") === 1, "Game widgets share one request");
    check(await p.getByText("Live", { exact: true }).count() === 0, "Scheduled tipoff is never presented as live");
    check(await p.getByText("Tonight's focus", { exact: true }).count() === 1, "Game day label renders its apostrophe correctly");
    check(await p.getByText(/20:30|8:30 PM/).count() >= 1, "UTC tipoff is displayed in the visitor timezone");
    check(await p.getByText(/Oct 26/).count() >= 2, "Date-only last game keeps October 26");
    const briefing = p.locator("section").filter({ has: p.getByRole("heading", { name: "Morning Briefing" }) });
    check((await briefing.innerText()).includes("Mon, Oct 26") && !(await briefing.innerText()).includes("Last game was"), "Last Night recognizes yesterday in Bahia");

    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      for (const name of ["Watch Highlights →", "Highlights →", "Open schedule", "Matchup context", "View all →"]) {
        const rect = await p.getByRole("link", { name, exact: true }).boundingBox();
        check(rect && rect.height >= 44 && rect.width >= 44, width + "px: " + name + " has a 44px touch target");
      }
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + "px: homepage has no horizontal overflow");
    }
    await p.screenshot({ path: ".impeccable/home-fixed-desktop.png", fullPage: true });

    live = true;
    await p.clock.fastForward(30001);
    await p.getByRole("link", { name: "Live context" }).waitFor();
    check(count("/api/games?teamId=2") === 2, "One 30-second refresh updates every game widget");
    check(await p.getByText("1st Qtr", { exact: true }).count() >= 2, "Live status propagates to hero and game cards");
    headline = "Fresh on focus";
    await p.evaluate(() => window.dispatchEvent(new Event("focus")));
    await p.getByText(headline + "0", { exact: true }).first().waitFor();
    check(count("/api/news?team=Celtics") === 2, "Focus refresh shares one news request");
    check(count("/api/games?teamId=2") === 3, "Focus refresh shares one games request");
    const beforeReturn = count("/api/games?teamId=2");
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await p.getByRole("link", { name: "Live context" }).waitFor();
    check(count("/api/games?teamId=2") === beforeReturn + 1, "Returning to a visible tab refreshes shared games");

    failGames = true;
    await p.clock.fastForward(30001);
    const error = p.getByRole("alert").filter({ hasText: "Unable to load game data" });
    await error.waitFor();
    failGames = false;
    await error.getByRole("button", { name: "Try again" }).click();
    await error.waitFor({ state: "detached" });
    await p.getByRole("link", { name: "Live context" }).waitFor();
    check(true, "Failed background refresh remains recoverable");

    const beforeFavorite = count("/api/games?teamId=2");
    await p.getByRole("button", { name: /^My Teams/ }).click();
    const favorites = p.getByRole("dialog", { name: "My Teams" });
    await favorites.getByRole("button", { name: "Boston Celtics", exact: true }).click();
    await favorites.getByRole("button", { name: "Brooklyn Nets", exact: true }).click();
    await p.keyboard.press("Escape");
    await p.getByText("Brooklyn Nets", { exact: true }).waitFor();
    await p.waitForFunction(() => !document.querySelector(".animate-pulse"));
    check(count("/api/games?teamId=2") === beforeFavorite, "Adding the selected team as a favorite reuses its games");
    check(count("/api/games?teamId=3") === 1, "Briefing and favorite feed share one Nets query");
    const countsBeforePoll = [count("/api/games?teamId=2"), count("/api/games?teamId=3")];
    const favoriteRefresh = p.waitForResponse((response) => response.url().includes("/api/games?teamId=3"));
    await p.clock.fastForward(30001);
    await favoriteRefresh;
    check(count("/api/games?teamId=2") === countsBeforePoll[0] + 1 && count("/api/games?teamId=3") === countsBeforePoll[1] + 1, "Favorites poll once per team, even with multiple consumers");

    await p.getByRole("button", { name: /^My Teams/ }).click();
    await favorites.getByRole("button", { name: "Clear all" }).click();
    await p.keyboard.press("Escape");
    live = false;
    await p.getByRole("button", { name: "Change Team" }).click();
    await p.getByRole("dialog", { name: "Select Your Team" }).getByRole("button", { name: /Raptors/ }).click();
    const action = p.getByRole("link", { name: "Matchup context" });
    await action.waitFor();
    check(await action.evaluate((el) => getComputedStyle(el).color === "rgb(255, 255, 255)" && getComputedStyle(el).backgroundColor === "rgb(0, 0, 0)"), "Raptors context action renders white text on black");
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: ".impeccable/home-fixed-mobile.png", fullPage: true });
    return { passed: passed.length, checks: passed };
  } finally {
    await context.close();
  }
}
