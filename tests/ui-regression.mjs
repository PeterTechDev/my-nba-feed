// Import this module in a Playwright session and call its default export with page.
// API fixtures keep failure/retry and spoiler checks independent of credentials.
export default async function runUiRegression(page) {
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  const passed = [];
  await p.addInitScript(() => localStorage.setItem("nba-feed-last-visit", new Date(Date.now() - 3 * 3600000).toISOString()));
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    passed.push(message);
  };
  const failures = new Set();
  const empty = new Set();
  const team = { id: 2, name: "Celtics", abbreviation: "BOS" };
  const opponent = { id: 3, name: "Nets", abbreviation: "BKN" };
  const game = { id: 1, date: new Date(Date.now() - 86400000).toISOString(), status: "Final", homeTeam: team, awayTeam: opponent, homeScore: 118, awayScore: 107, isHome: true, won: true };
  const stats = { wins: 27, losses: 14, ppg: "118.0", oppg: "107.0", gamesPlayed: 41 };
  const digestDate = new Date().toISOString().slice(0, 10);
  const digest = { date: digestDate, title: "Daily NBA test digest", style: "analytical", content: "## Game analysis\nA useful summary.", games_covered: ["BOS vs BKN"], stats_highlighted: ["118 points"], metadata: { model: "test", generation_time_ms: 100 }, created_at: new Date().toISOString() };
  const olderDigest = { ...digest, date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), title: "Yesterday's NBA digest", content: "Archive analysis." };
  let digestFeedback = null;
  const fixtures = {
    games: { lastGame: game, currentGame: null, nextGame: null, record: { wins: 27, losses: 14 }, error: null },
    schedule: { games: [game] },
    highlights: { videos: {}, failedDates: [] },
    players: { players: [{ id: 1, firstName: "Test", lastName: "Player", position: "F", jerseyNumber: "0", height: "6-8", weight: "210" }] },
    standings: { standings: [{ ...team, ...stats, conference: "East", division: "Atlantic" }] },
    compare: { team1: stats, team2: { ...stats, wins: 18 }, headToHead: { team1Wins: 2, team2Wins: 1 } },
    news: [{ title: "Celtics win 118-107", safeTitle: "Spoiler-protected headline", isSpoiler: true, category: "recap", source: "Test", pubDate: new Date().toISOString(), link: "https://example.com/news" }, { title: "Older team update", safeTitle: "Older team update", isSpoiler: false, category: "analysis", source: "Test", pubDate: new Date(Date.now() - 9 * 3600000).toISOString(), link: "https://example.com/older" }],
    social: { posts: [{ id: "post-1", title: "Celtics win 118-107", score: 100, comments: 20, created: Date.now() / 1000, url: "https://example.com/post", subreddit: "bostonceltics", author: "fan", thumbnail: "https://example.com/spoiler.jpg", category: "postgame" }] },
  };
  await p.route("http://localhost:3000/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const key = requestUrl.pathname.split("/")[2];
    if (key === "digest") {
      let body;
      if (requestUrl.pathname.endsWith("/feedback")) {
        if (route.request().method() === "POST") digestFeedback = route.request().postDataJSON();
        body = { feedback: [], success: true };
      } else body = requestUrl.searchParams.has("range") ? { digests: [digest, olderDigest] } : { digest, isToday: true };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }
    const fail = failures.has(key);
    let data = fixtures[key];
    if (empty.has(key)) data = key === "news" ? [] : { [key === "schedule" ? "games" : key === "social" ? "posts" : key]: [] };
    await route.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify(fail ? { error: "upstream failure" } : data) });
  });
  const errors = p.getByRole("alert").filter({ hasText: "Unable to load" });
  const go = (path) => p.goto(`http://localhost:3000${path}`);
  try {
    await p.setViewportSize({ width: 1440, height: 1000 });
    for (const [path, key, subject] of [["/", "games", "game data"], ["/compare", "compare", "team comparison"], ["/players", "players", "players"], ["/standings", "standings", "standings"], ["/highlights", "schedule", "recent games"], ["/schedule", "schedule", "the schedule"], ["/social", "social", "social posts"]]) {
      failures.add(key);
      await go(path);
      await p.getByRole("alert").filter({ hasText: `Unable to load ${subject}` }).waitFor();
      check(await errors.count() === 1, `${path}: one recoverable error`);
      failures.delete(key);
      await p.getByRole("button", { name: "Try again" }).click();
      await errors.waitFor({ state: "detached" });
      check(true, `${path}: retry recovers`);
    }

    await go("/compare");
    await p.getByText("27", { exact: true }).first().waitFor();
    check(await p.getByLabel("Team 1", { exact: true }).count() === 1, "Comparison selects have accessible labels");
    failures.add("compare");
    await p.getByLabel("Team 1", { exact: true }).selectOption("4");
    await errors.waitFor();
    check(await p.getByText("27", { exact: true }).count() === 0, "Changing teams cannot retain previous comparison results on failure");
    failures.delete("compare");
    await p.getByLabel("Team 2", { exact: true }).selectOption("4");
    await p.getByText("Select two different teams to compare").waitFor();
    check(await errors.count() === 0, "Same-team comparison remains guarded");

    empty.add("schedule");
    await go("/highlights");
    await p.getByText("No recent games found").waitFor();
    check(await errors.count() === 0, "Successful empty response stays distinct from an error");
    const search = await p.getByRole("link", { name: "More on YouTube" }).getAttribute("href");
    check(decodeURIComponent(search).includes(String(new Date().getFullYear())), "Highlights search uses current year");
    empty.delete("schedule");

    await go("/");
    await p.getByRole("button", { name: "Change Team" }).click();
    const picker = p.getByRole("dialog", { name: "Select Your Team" });
    await picker.waitFor();
    check(await picker.evaluate((el) => el.contains(document.activeElement)), "Team picker receives focus");
    for (let i = 0; i < 34; i++) await p.keyboard.press("Tab");
    check(await picker.evaluate((el) => el.contains(document.activeElement)), "Team picker contains tab focus");
    await p.keyboard.press("Escape");
    await picker.waitFor({ state: "detached" });
    check(await p.getByRole("button", { name: "Change Team" }).evaluate((el) => el === document.activeElement), "Escape closes picker and restores focus");
    await p.getByRole("button", { name: "Spoiler settings", exact: true }).click();
    const settings = p.getByRole("dialog", { name: "Spoiler settings" });
    await settings.waitFor();
    await p.getByRole("checkbox", { name: /Hide scores/ }).uncheck();
    await p.keyboard.press("Escape");
    await settings.waitFor({ state: "detached" });
    check(await p.getByRole("button", { name: /^Custom protection/ }).count() === 1, "Partial spoiler preferences are labelled accurately");
    await p.setViewportSize({ width: 320, height: 844 });
    check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "320px: custom protection and My Teams controls fit together");
    await p.getByRole("button", { name: /^Custom protection/ }).click();
    await p.getByRole("button", { name: /^Spoiler-free/ }).click();
    check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "320px: visible-score controls fit together");
    await p.getByRole("button", { name: /^Spoilers visible/ }).click();
    await p.setViewportSize({ width: 1440, height: 1000 });

    await go("/social");
    await p.getByText("Spoiler-protected post from r/bostonceltics").waitFor();
    check(await p.getByText("Celtics win 118-107", { exact: true }).count() === 0, "Social result title is absent until reveal");
    check(await p.locator('img[src="https://example.com/spoiler.jpg"]').count() === 0, "Social thumbnail is absent until reveal");
    await p.getByRole("button", { name: "Reveal post and image" }).click();
    await p.getByText("Celtics win 118-107", { exact: true }).waitFor();
    check(await p.locator('img[src="https://example.com/spoiler.jpg"]').count() === 1, "Explicit reveal shows title and image");
    await p.getByRole("button", { name: "Hide spoilers", exact: true }).click();
    check(await p.getByText("Celtics win 118-107", { exact: true }).count() === 0, "Post can be hidden again");
    await p.reload();
    await p.getByText("Spoiler-protected post from r/bostonceltics").waitFor();
    check(true, "Spoiler preferences survive reload");

    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 844 });
      const nav = p.getByRole("navigation", { name: "Main navigation" });
      const toggle = nav.getByRole("button", { name: /^Spoiler-free/ });
      const rect = await toggle.boundingBox();
      check(rect.x >= 0 && rect.x + rect.width <= width && rect.height >= 44, `${width}px: spoiler control visible with 44px target`);
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no horizontal page overflow`);
      const favoriteRect = await nav.getByRole("button", { name: /^My Teams/ }).boundingBox();
      check(favoriteRect.x >= 0 && favoriteRect.x + favoriteRect.width <= width && favoriteRect.width >= 44 && favoriteRect.height >= 44, `${width}px: My Teams has a visible 44px target`);
      if (width < 1280) {
        await p.getByRole("button", { name: "Open navigation" }).click();
        check(await nav.getByRole("link").count() === 10, `${width}px: all destinations available in menu`);
        await nav.getByRole("link", { name: "Schedule", exact: true }).click();
        await p.waitForURL("**/schedule");
        check(await p.getByRole("button", { name: "Open navigation" }).count() === 1, `${width}px: navigation closes after route change`);
      }
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await go("/");
    await p.getByRole("heading", { name: "Morning Briefing" }).waitFor();
    check(true, "Morning Briefing survives production reconciliation");
    await p.getByText(/Since your last visit/).waitFor();
    check(await p.getByText(/Since your last visit/).count() === 1, "Previous-visit separator survives StrictMode and feed reconciliation");
    await p.getByRole("button", { name: /^My Teams/ }).click();
    const favorites = p.getByRole("dialog", { name: "My Teams" });
    await favorites.waitFor();
    check(await favorites.evaluate((el) => el.contains(document.activeElement)), "My Teams receives keyboard focus");
    await favorites.getByRole("button", { name: "Boston Celtics", exact: true }).click();
    await favorites.getByRole("button", { name: "Brooklyn Nets", exact: true }).click();
    check(await favorites.getByRole("button", { pressed: true }).count() === 2, "My Teams allows multiple selections");
    await p.keyboard.press("Escape");
    await favorites.waitFor({ state: "detached" });
    check(await p.getByRole("button", { name: /^My Teams/ }).evaluate((el) => el === document.activeElement), "My Teams Escape restores focus");
    await p.getByRole("heading", { name: "My Teams", exact: true }).waitFor();
    check(await p.getByText("Boston Celtics", { exact: true }).count() === 1 && await p.getByText("Brooklyn Nets", { exact: true }).count() === 1, "Favorite teams render personalized sections");
    await p.waitForFunction(() => !document.querySelector(".animate-pulse"));
    check(await p.getByText("118", { exact: true }).count() === 0, "Personalized scores stay hidden with spoiler protection");
    await p.getByRole("button", { name: /^Spoiler-free/ }).click();
    check(await p.getByText("118", { exact: true }).count() > 0, "Personalized scores remain available when protection is disabled");
    await p.getByRole("button", { name: /^Spoilers visible/ }).click();
    await p.reload();
    await p.getByRole("button", { name: "My Teams (2 selected)" }).waitFor();
    check(true, "Favorite storage key and persisted selections are preserved");
    failures.add("news");
    await p.reload();
    const favoriteNewsError = errors.filter({ hasText: "Unable to load Celtics news" });
    await favoriteNewsError.waitFor();
    check(true, "Personalized news retains recoverable error handling");
    failures.delete("news");
    await favoriteNewsError.getByRole("button", { name: "Try again" }).click();
    await favoriteNewsError.waitFor({ state: "detached" });
    check(true, "Personalized news retry recovers");
    await p.getByRole("button", { name: /^My Teams/ }).click();
    await favorites.getByRole("button", { name: "Clear all" }).click();
    check(await favorites.getByRole("button", { pressed: true }).count() === 0, "Clear all preserves league-feed fallback");
    await favorites.getByRole("button", { name: "Close", exact: true }).click();
    await p.getByRole("heading", { name: "News", exact: true }).waitFor();
    check(true, "Clearing favorites restores default news feed");
    await p.getByRole("button", { name: "Open navigation" }).click();
    await p.getByRole("link", { name: "Digest", exact: true }).click();
    await p.getByRole("heading", { name: "AI Digest", exact: true }).waitFor();
    await p.getByRole("button", { name: "Reveal digest", exact: true }).click();
    await p.getByRole("heading", { name: "Daily NBA test digest", exact: true }).waitFor();
    check(true, "Digest remains reachable and renders markdown content");
    await p.getByRole("region", { name: "Digest archive" }).getByRole("button", { expanded: false }).click();
    await p.getByRole("button", { name: "Reveal digest", exact: true }).click();
    await p.getByText("Archive analysis.", { exact: true }).waitFor();
    check(true, "Digest archive expands");
    const feedbackResponse = p.waitForResponse((response) => response.url().endsWith("/api/digest/feedback") && response.request().method() === "POST");
    await p.locator("button").filter({ has: p.locator("svg.lucide-flame") }).first().click();
    await feedbackResponse;
    await p.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((button) => button.disabled && button.querySelector("svg.lucide-flame")));
    check(digestFeedback?.date === digestDate && digestFeedback?.reaction === "fire", "Digest reaction uses original feedback API contract");
    check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Digest fits mobile viewport");
    return { passed: passed.length, checks: passed };
  } finally {
    await context.close();
  }
}
