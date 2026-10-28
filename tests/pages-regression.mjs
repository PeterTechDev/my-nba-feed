// Run with a Playwright page and a production build on http://localhost:3000.
export default async function runPagesRegression(page) {
  const context = await page.context().browser().newContext({ timezoneId: "America/Bahia" });
  const p = await context.newPage(), passed = [], pageErrors = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); passed.push(message); };
  p.on("pageerror", (error) => pageErrors.push(error.message));
  const team = { id: 2, name: "Celtics", abbreviation: "BOS" }, nets = { id: 3, name: "Nets", abbreviation: "BKN" };
  const digest = { date: "2026-10-27", title: "Boston wins 118-107", style: "analytical",
    content: "**Celtics recap**\n\nBoston won 118-107.\n\n#### Extra detail\n-10 point differential",
    games_covered: ["BOS vs BKN"], stats_highlighted: ["Tatum: 32 points"], metadata: { model: "test", generation_time_ms: 100 }, created_at: "2026-10-27T10:00:00Z" };
  const old = { ...digest, date: "2026-10-26", title: "Yesterday's result" };
  const game = { id: 1, date: "2026-10-26", status: "Final/OT", homeTeam: team, awayTeam: nets, homeScore: 118, awayScore: 114 };
  let failure = null, rejectVote = true, votes = 0;
  await p.route("http://localhost:3000/api/**", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname === "/api/digest/feedback" ? "feedback" : url.pathname === "/api/digest" && url.searchParams.has("range") ? "archive" : url.pathname.split("/")[2];
    if (key === failure) return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline"}' });
    let body;
    if (key === "feedback") {
      if (route.request().method() === "POST") {
        votes++;
        if (rejectVote) return route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"write failed"}' });
        body = { success: true, feedback: { date: digest.date, fire: 1, thumbsdown: 0, total: 1 } };
      } else body = { feedback: [] };
    } else if (key === "digest") body = { digest, isToday: true };
    else if (key === "archive") body = { digests: [digest, old] };
    else if (key === "games") body = { lastGame: { ...game, isHome: true, won: true }, currentGame: null, nextGame: null, record: { wins: 1, losses: 0 } };
    else if (key === "news") body = [];
    else if (key === "schedule") body = { games: [
      game,
      { ...game, id: 2, date: "2026-10-27", status: "1st Qtr", startTime: "2026-10-27T23:30:00Z" },
      { ...game, id: 3, date: "2026-10-28", status: "Postponed" },
      { ...game, id: 4, date: "2026-10-29", status: "Scheduled", startTime: "2026-10-29T23:30:00Z" },
    ] };
    else if (key === "highlights") body = { videos: { "2026-10-26": { id: "DTNqMLNVBC8", thumbnail: "https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg", url: "https://www.youtube.com/watch?v=DTNqMLNVBC8", duration: 600 } }, failedDates: [] };
    else if (key === "players") body = { players: [{ id: 1, firstName: "Current", lastName: "Player", jerseyNumber: "7", position: "G", height: "6-4", weight: "200" }], source: "ESPN" };
    else if (key === "standings") body = { standings: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: "Team " + i, abbreviation: i === 0 ? "BOS" : "BKN", conference: "East", wins: 10 - i, losses: i })) };
    else if (key === "compare") body = { team1: { wins: 2, losses: 1, ppg: "110", oppg: "105", gamesPlayed: 3 }, team2: { wins: 3, losses: 1, ppg: "120", oppg: "105", gamesPlayed: 4 }, headToHead: { team1Wins: 0, team2Wins: 0 } };
    else if (key === "social") body = { source: "news-index", posts: [
      { id: "1", title: "Boston wins 118-107", score: null, comments: null, created: Date.now() / 1000, url: "https://reddit.com/r/bostonceltics/1", subreddit: "bostonceltics", author: "fan", thumbnail: null, category: "postgame" },
      { id: "2", title: "League discussion", score: null, comments: null, created: Date.now() / 1000, url: "https://reddit.com/r/nba/2", subreddit: "nba", author: "fan", thumbnail: null, category: "discussion" },
    ] };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  const go = (path) => p.goto("http://localhost:3000" + path);
  const error = (text) => p.getByRole("alert").filter({ hasText: text });
  try {
    await p.clock.install({ time: new Date("2026-10-27T10:00:00Z") });
    await p.setViewportSize({ width: 390, height: 844 });
    failure = "feedback"; await go("/digest");
    await p.getByRole("button", { name: "Reveal digest", exact: true }).waitFor();
    check(await p.getByText("Boston wins 118-107", { exact: true }).count() === 0, "Digest title, score and stats stay out of the protected DOM");
    check(await p.getByText("Tatum: 32 points", { exact: true }).count() === 0, "Protected digest does not leak stat chips");
    await error("Unable to load digest reactions").waitFor();
    check(true, "Feedback outage does not hide valid digest content");
    failure = null; await error("Unable to load digest reactions").getByRole("button", { name: "Try again" }).click();
    await error("Unable to load digest reactions").waitFor({ state: "detached" });
    await p.getByRole("button", { name: "Reveal digest", exact: true }).click();
    await p.getByRole("heading", { name: digest.title, exact: true }).waitFor();
    await p.getByText("Celtics recap", { exact: true }).waitFor();
    check(true, "Previously blocking Markdown renders after explicit reveal");
    const fire = p.getByRole("button", { name: "Like this digest", exact: true });
    check((await fire.boundingBox()).height >= 44, "Digest reaction target is at least 44px");
    const voteResponse = p.waitForResponse((response) => response.request().method() === "POST");
    await fire.click(); await voteResponse;
    await error("Your reaction could not be saved").waitFor();
    check(await fire.isEnabled() && (await fire.innerText()) === "0", "Failed vote leaves the count unchanged and allows retry");
    rejectVote = false;
    await fire.click(); await p.getByText("Reaction saved", { exact: true }).waitFor();
    check(await fire.isDisabled() && (await fire.innerText()) === "1" && votes === 2, "Only a confirmed successful vote increments and locks the control");
    const archive = p.getByRole("region", { name: "Digest archive" });
    const toggle = archive.getByRole("button", { expanded: false });
    await toggle.click();
    const expanded = archive.getByRole("button", { expanded: true });
    check(Boolean(await expanded.getAttribute("aria-controls")), "Archive exposes expansion and its controlled panel");
    await archive.getByRole("button", { name: "Reveal digest", exact: true }).click();
    await p.getByRole("heading", { name: old.title, exact: true }).waitFor();
    await p.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.11.1/axe.min.js" });
    const axe = await p.evaluate(async () => {
      const a = await window.axe.run(document.querySelector("main"));
      return a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) }));
    });
    check(axe.length === 0, "Populated Digest has no axe violations: " + JSON.stringify(axe));
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: ".impeccable/digest-fixed-mobile.png", fullPage: true });
    for (const [key, subject] of [["digest", "the latest digest"], ["archive", "the digest archive"]]) {
      failure = key; await p.reload(); await error("Unable to load " + subject).waitFor();
      check(await p.getByText("No digest available yet", { exact: true }).count() === 0, key + ": service error is not confused with empty data");
      failure = null; await error("Unable to load " + subject).getByRole("button", { name: "Try again" }).click();
      await error("Unable to load " + subject).waitFor({ state: "detached" });
      check(true, key + ": retry recovers independently");
    }
    await go("/schedule"); await p.getByText("Live · 1st Qtr", { exact: true }).filter({ visible: true }).waitFor();
    check(await p.getByText("Postponed", { exact: true }).filter({ visible: true }).count() === 1, "Schedule preserves postponement");
    check(await p.getByText("Final/OT", { exact: true }).filter({ visible: true }).count() === 1, "Schedule recognizes overtime finals");
    check(await p.getByText(/8:30 PM/).count() >= 1, "Schedule shows local tipoff with timezone");
    await go("/highlights"); await p.getByText("Mon, Oct 26", { exact: true }).waitFor();
    check(await p.locator('main img[src="https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg"]').count() === 1, "Highlights thumbnails remain visible with spoilers hidden");
    check(await p.locator("main iframe").count() === 0, "The YouTube player is not loaded before play");
    await p.getByRole("button", { name: "Play highlights vs Nets", exact: true }).click();
    check((await p.locator("main iframe").getAttribute("src")).startsWith("https://www.youtube-nocookie.com/embed/DTNqMLNVBC8"), "Highlights play inside the site after a click");
    await p.getByRole("button", { name: "Close player", exact: true }).click();
    check(await p.locator("main iframe").count() === 0, "Closing the player stops and removes its iframe");
    check((await p.getByRole("link", { name: "Search more highlights" }).boundingBox()).height >= 44, "Highlights footer has a 44px target");
    await go("/compare"); await p.getByText("120", { exact: true }).waitFor();
    check(await p.locator("main .rounded-r").first().evaluate((el) => getComputedStyle(el).backgroundColor !== "rgb(0, 0, 0)"), "Nets chart uses a visible color");
    check((await p.getByLabel("Team 1", { exact: true }).boundingBox()).height >= 44, "Comparison selects have 44px targets");
    await go("/social"); await p.getByRole("button", { name: "r/nba", exact: true }).click();
    check(await p.getByRole("button", { name: "r/nba", exact: true }).getAttribute("aria-pressed") === "true", "Social filters expose their selected state");
    check(await p.getByText(/news index/).count() === 1, "Community fallback source is explained");
    check(!(await p.locator("main").innerText()).includes("↑ 0"), "Unavailable post metrics are not fabricated as zero");
    await go("/standings"); await p.getByText("Playoff position", { exact: true }).first().waitFor();
    check(await p.getByText("Play-In position", { exact: true }).count() === 4, "Standings expose playoff and play-in meaning as text");
    for (const path of ["/digest", "/players", "/standings", "/schedule", "/highlights", "/compare", "/social"]) {
      await go(path); await p.waitForFunction(() => !document.querySelector("main .animate-pulse"));
      check((await p.title()).includes("| NBA Feed") && (await p.title()) !== "NBA Feed", path + ": document title identifies the route");
      for (const width of [320, 390, 768, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path + ": no horizontal page overflow at " + width + "px");
      }
    }
    await go("/");
    await p.evaluate(() => {
      localStorage.setItem("nba-feed-team", JSON.stringify({ version: 0, state: { selectedTeam: { id: 15, abbreviation: "MIA", name: "Heat" } } }));
      localStorage.setItem("nba-feed-favorite-teams", JSON.stringify({ version: 0, state: { favoriteTeamIds: [15, 16, 12, 13, 24, 25, 26, 27, 2] } }));
    });
    await p.reload(); await p.getByRole("heading", { name: "Heat", exact: true }).waitFor();
    const saved = await p.evaluate(() => ({ team: JSON.parse(localStorage.getItem("nba-feed-team")), favorites: JSON.parse(localStorage.getItem("nba-feed-favorite-teams")) }));
    check(saved.team.version === 2 && saved.team.state.selectedTeam.id === 16 && saved.team.state.selectedTeam.logo === "/teams/1610612748.svg", "Saved Heat selection migrates by identity to provider ID 16 and its bundled logo");
    check(JSON.stringify(saved.favorites.state.favoriteTeamIds) === JSON.stringify([16, 15, 13, 12, 25, 24, 27, 26, 2]), "All eight corrected favorite IDs migrate without dropping or swapping teams");
    await p.reload();
    const again = await p.evaluate(() => JSON.parse(localStorage.getItem("nba-feed-favorite-teams")));
    check(JSON.stringify(again.state.favoriteTeamIds) === JSON.stringify(saved.favorites.state.favoriteTeamIds), "Preference migration is applied exactly once");
    check(pageErrors.length === 0, "No uncaught browser errors: " + JSON.stringify(pageErrors));
    return { passed: passed.length, checks: passed };
  } finally { await context.close(); }
}
