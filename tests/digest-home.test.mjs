import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { headlineIsAboutTeam, teamByAbbreviation, teams } from "../src/lib/teams.ts";
import { parseCoveredGames } from "../src/lib/digest.ts";

const require = createRequire(import.meta.url);
const ReactCJS = require("react");

function load(file, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => imports[id] ?? (id.endsWith(".module.css")
      ? { default: new Proxy({}, { get: (_target, key) => String(key) }) }
      : require(id)),
    Date, URL, AbortSignal, Response, Buffer, setTimeout, clearTimeout, console,
  });
  return exports;
}

const team = (abbreviation) => {
  const found = teams.find((entry) => entry.abbreviation === abbreviation);
  assert.ok(found, abbreviation);
  return found;
};
const count = (html, needle) => html.split(needle).length - 1;
const visibleText = (html) => html.replace(/datetime="[^"]*"/gi, "").replace(/<[^>]+>/g, " ");
const RECORD = /\b\d{1,2}[–—-]\d{1,2}\b/;

// headlineIsAboutTeam names the club: name, city + name, or a city that is not
// Los Angeles or New York. Possessives are 's, s' and a trailing apostrophe.
// There is no score regex and no "and" pair rule in src/lib/teams.ts.
const COLUMNS = ["BOS", "BKN", "NYK", "LAL", "LAC"];
const MATRIX = [
  { h: "Celtics edge Nets 121-115 behind late run", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Celtics star Jayson Tatum listed as questionable with ankle injury", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Boston rallies past Brooklyn 121-115", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Knicks top Heat; Celtics loom next on schedule", BOS: true, BKN: false, NYK: true, LAL: false, LAC: false },
  { h: "C's hold off Nets in overtime thriller", BOS: false, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Jayson Tatum drops 40 in overtime win", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "CELTICS ROUT NETS AT TD GARDEN", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "celtics' bench shines in comeback", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Boston Marathon organizers announce 2027 route", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Nets trade Cam Thomas to Celtics in three-team deal", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "New York Knicks win 110-104 at Brooklyn", BOS: false, BKN: true, NYK: true, LAL: false, LAC: false },
  { h: "Los Angeles beats Sacramento 118-104", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "LA Clippers sign veteran guard", BOS: false, BKN: false, NYK: false, LAL: false, LAC: true },
  { h: "Takeaways: How the Celtics held off the Nets in OT", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Nets fall to Celtics 115-121", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Lakers trade talk heats up", BOS: false, BKN: false, NYK: false, LAL: true, LAC: false },
  { h: "Knicks and Nets renew New York rivalry", BOS: false, BKN: true, NYK: true, LAL: false, LAC: false },
  { h: "Boston College stuns Duke 78-70", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Red Sox, Celtics share Boston spotlight", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Why the Celtics are 3-1", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Cs win again", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "The Celtics' Jayson Tatum: 'We needed that'", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
];

for (const row of MATRIX) {
  test(`headline: ${row.h}`, () => {
    for (const abbreviation of COLUMNS) {
      assert.equal(headlineIsAboutTeam(row.h, team(abbreviation)), row[abbreviation], `${row.h} / ${abbreviation}`);
    }
  });
}

const RULES = [
  { rule: "nome", h: "Celtics", BOS: true, BKN: false },
  { rule: "nome", h: "celtics", BOS: true },
  { rule: "nome", h: "CELTICS", BOS: true, BKN: false },
  { rule: "nome", h: "Celtics'", BOS: true },
  { rule: "nome", h: "celtics' bench shines", BOS: true, BKN: false },
  { rule: "nome", h: "Celtics's bench", BOS: true },
  { rule: "nome", h: "Nets'", BKN: true, BOS: false },
  // The roster spelling is Celtics, so Celtic's is not that name plus a possessive.
  { rule: "nome", h: "Celtic's", BOS: false },
  { rule: "nome", h: "76ers", PHI: true },
  { rule: "nome", h: "Sixers", PHI: false },
  { rule: "nome", h: "Trail Blazers", POR: true },
  { rule: "nome", h: "Blazers", POR: false },
  { rule: "cidade + nome", h: "Boston Celtics", BOS: true, BKN: false },
  { rule: "cidade + nome", h: "Brooklyn Nets", BKN: true, NYK: false },
  { rule: "cidade + nome", h: "Los Angeles Lakers", LAL: true, LAC: false },
  { rule: "cidade + nome", h: "New York Knicks", NYK: true, BKN: false },
  // "LA" is not a city on the roster. Clippers/Lakers match as the club name.
  { rule: "cidade + nome", h: "LA Clippers", LAC: true, LAL: false },
  { rule: "cidade + nome", h: "LA Lakers", LAL: true, LAC: false },
  { rule: "cidade + nome", h: "LA", LAL: false, LAC: false },
  { rule: "cidade", h: "Boston", BOS: true },
  { rule: "cidade", h: "Brooklyn", BKN: true, NYK: false },
  { rule: "cidade", h: "Miami", MIA: true, BOS: false },
  { rule: "cidade", h: "Los Angeles", LAL: false, LAC: false },
  { rule: "cidade", h: "New York", NYK: false, BKN: false },
  // City alone is the documented price of the rule.
  { rule: "cidade", h: "Boston Marathon organizers announce 2027 route", BOS: true, BKN: false },
  { rule: "cidade", h: "Boston College stuns Duke 78-70", BOS: true, BKN: false },
  { rule: "fronteira", h: "Netsuke exhibition opens", BKN: false, BOS: false },
  { rule: "fronteira", h: "Heated rivalry talk", MIA: false },
  { rule: "fronteira", h: "Magical evening on the floor", ORL: false },
  { rule: "fronteira", h: "Bullseye drill", CHI: false },
  { rule: "fronteira", h: "Sunset over the water", PHX: false },
  { rule: "fronteira", h: "Lakers trade talk heats up", MIA: false, LAL: true },
  { rule: "dois times", h: "Celtics and Lakers open a back-to-back", BOS: true, LAL: true, LAC: false },
  { rule: "dois times", h: "Los Angeles Clippers and Lakers trade", LAL: true, LAC: true },
  { rule: "dois times", h: "Knicks & Nets", BKN: true, NYK: true, BOS: false },
  // Accepted price: the name matches even when it is not the subject of the clause.
  { rule: "preço aceito", h: "Heat wave and Celtics fans", MIA: true, BOS: true },
  { rule: "preço aceito", h: "Magic Johnson and Celtics legends", ORL: true, BOS: true },
];

for (const row of RULES) {
  test(`${row.rule}: ${row.h}`, () => {
    for (const [abbreviation, value] of Object.entries(row)) {
      if (abbreviation === "rule" || abbreviation === "h") continue;
      assert.equal(headlineIsAboutTeam(row.h, team(abbreviation)), value, `${row.h} / ${abbreviation}`);
    }
  });
}

test("fronteira: every roster name stops at a word boundary", () => {
  for (const entry of teams) {
    assert.equal(headlineIsAboutTeam(entry.name, entry), true, entry.name);
    assert.equal(headlineIsAboutTeam(`${entry.name}xyz`, entry), false, `${entry.name}xyz`);
    assert.equal(headlineIsAboutTeam(`${entry.city} ${entry.name}`, entry), true, `${entry.city} ${entry.name}`);
    const cityAlone = entry.city !== "Los Angeles" && entry.city !== "New York";
    assert.equal(headlineIsAboutTeam(entry.city, entry), cityAlone, entry.city);
  }
});

test("a record, a clock time or a date does not name a team", () => {
  // Nothing in teams.ts replaced the removed score regex. A figure matches only when the name is also there.
  assert.equal(headlineIsAboutTeam("The record is 3-1", team("BOS")), false);
  assert.equal(headlineIsAboutTeam("Tip is 8:30", team("BOS")), false);
  assert.equal(headlineIsAboutTeam("Notes: visit on 10-26", team("BOS")), false);
  assert.equal(headlineIsAboutTeam("Notes: visit on 10/26", team("BOS")), false);
  assert.equal(headlineIsAboutTeam("Notes: visit on 10-26-2026", team("BOS")), false);
  assert.equal(headlineIsAboutTeam("Why the Celtics are 3-1", team("BOS")), true);
  assert.equal(headlineIsAboutTeam("Celtics 12-3", team("BOS")), true);
});

test("the removed pair rule still names every club that is written out", () => {
  // The pair rule was removed on purpose. A named Celtics side is enough.
  assert.equal(headlineIsAboutTeam("Warriors and Lakers talk trade as Celtics watch", team("BOS")), true);
  assert.equal(headlineIsAboutTeam("Warriors and Lakers talk trade as Celtics watch", team("GSW")), true);
  assert.equal(headlineIsAboutTeam("Warriors and Lakers talk trade as Celtics watch", team("LAL")), true);
  assert.equal(headlineIsAboutTeam("Pistons and Bulls swap guards; Celtics next?", team("BOS")), true);
  assert.equal(headlineIsAboutTeam("Pistons and Bulls swap guards; Celtics next?", team("DET")), true);
  assert.equal(headlineIsAboutTeam("Pistons and Bulls swap guards; Celtics next?", team("CHI")), true);
  assert.equal(headlineIsAboutTeam("Knicks beat Heat 101-98; Celtics rest Tatum", team("BOS")), true);
  assert.equal(headlineIsAboutTeam("Knicks beat Heat 101-98; Celtics rest Tatum", team("NYK")), true);
  assert.equal(headlineIsAboutTeam("Knicks beat Heat 101-98; Celtics rest Tatum", team("MIA")), true);
});

describe("known-gap", () => {
  test("nicknames, abbreviations and a player without a team stay false", () => {
    // known-gap: aceito — apelidos, siglas e jogador sem o nome do time são limitação aceita.
    assert.equal(headlineIsAboutTeam("C's hold off Nets in overtime thriller", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("Cs win again", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("BOS beats BKN 110-104", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("BOS beats BKN 110-104", team("BKN")), false);
    assert.equal(headlineIsAboutTeam("Jayson Tatum drops 40 in overtime win", team("BOS")), false);
  });
});

test("teamByAbbreviation accepts canonical and ESPN codes and rejects case changes and blanks", () => {
  const rows = [
    ["BOS", "Celtics"],
    ["BKN", "Nets"],
    ["NYK", "Knicks"],
    ["LAL", "Lakers"],
    ["LAC", "Clippers"],
    ["GSW", "Warriors"],
    ["NY", "Knicks"],
    ["BRK", "Nets"],
    ["GS", "Warriors"],
    ["NO", "Pelicans"],
    ["SA", "Spurs"],
    ["PHO", "Suns"],
    ["UTAH", "Jazz"],
    ["WSH", "Wizards"],
    ["CHO", "Hornets"],
    ["bos", undefined],
    ["Bos", undefined],
    ["ny", undefined],
    ["bkn", undefined],
    ["", undefined],
    ["NOPE", undefined],
    ["Lakers", undefined],
  ];
  for (const [code, name] of rows) {
    assert.equal(teamByAbbreviation(code)?.name, name, JSON.stringify(code));
  }
});

test("parseCoveredGames keeps real games, drops malformed rows, and preserves duplicates", () => {
  const celtics = { awayAbbr: "BKN", homeAbbr: "BOS", awayScore: 110, homeScore: 121 };
  const bulls = { awayAbbr: "CHI", homeAbbr: "BOS", awayScore: 99, homeScore: 134 };
  assert.deepEqual(parseCoveredGames([]), []);
  assert.deepEqual(parseCoveredGames(["BKN 110-121 BOS"]), [celtics]);
  assert.deepEqual(parseCoveredGames(["  BKN 110\u2013121 BOS  "]), [celtics]);
  assert.deepEqual(parseCoveredGames(["CHI 99\u2014134 BOS"]), [bulls]);
  assert.deepEqual(parseCoveredGames(["BKN 1-300 BOS"]), [{ awayAbbr: "BKN", homeAbbr: "BOS", awayScore: 1, homeScore: 300 }]);
  assert.deepEqual(parseCoveredGames([
    "",
    "not a game",
    "bkn 110-121 BOS",
    "BKN 110-121",
    "BKN 110 121 BOS",
    "B 110-121 BOS",
    "ABCDEF 110-121 BOS",
    "BKN 0-121 BOS",
    "BKN 121-121 BOS",
    "BKN 301-99 BOS",
    "BKN 99-301 BOS",
    "BKN 110-121 BOS extra",
  ]), []);
  assert.deepEqual(parseCoveredGames(["BKN 110-121 BOS", "nope", "BKN 110-121 BOS"]), [celtics, celtics]);
});

const spoilerModule = load("components/SpoilerModeProvider.tsx", {
  "@/hooks/useSpoilerMode": load("hooks/useSpoilerMode.ts"),
});
const { digestContentIsProtected } = spoilerModule;

for (const hideScores of [false, true]) {
  for (const hideHeadlines of [false, true]) {
    test(`digestContentIsProtected hideScores=${hideScores} hideHeadlines=${hideHeadlines}`, () => {
      assert.equal(digestContentIsProtected({ hideScores, hideHeadlines }), hideScores || hideHeadlines);
    });
  }
}

const dates = load("lib/nbaDate.ts");
const digestLib = load("lib/digest.ts");
const teamsLib = load("lib/teams.ts");
const api = load("lib/api.ts");
const newsLib = load("lib/news.ts", { "./api": api, "./teams": teamsLib });
const presentation = load("lib/digestPresentation.ts", { "@/lib/nbaDate": dates, "@/lib/digest": digestLib });

const LEAGUE_TITLES = [
  "Celtics open practice in the garden",
  "Celtics film session stays private",
  "Boston Celtics walkthrough notes",
  "Knicks rest starters on Tuesday",
  "Heat prepare for a road trip",
  "Lakers discuss lineup changes",
  "Bulls schedule a morning shootaround",
  "Nets review film from Friday",
  "Warriors add a practice session",
];
let shownLeagueTitles = [];
const homePage = load("app/page.tsx", {
  "@/components/TeamHeader": { default: () => null },
  "@/components/GameDayHero": { default: () => null },
  "@/components/GameSection": { HomeDigestCard: () => null, LastGameCard: () => null, NextGameCard: () => null },
  "@/components/NewsFeed": { default: () => null },
  "@/components/GameDataProvider": { default: ({ children }) => children },
  "@/components/TopPlaysCard": { default: () => null },
  "@/components/MorningBriefingCard": { default: () => null },
  "@/components/EndOfSession": { default: () => null },
  "@/components/PersonalizedFeed": {
    default: () => null,
    LeagueNewsSection: ({ news }) => {
      shownLeagueTitles = news.map((item) => item.title);
      return null;
    },
  },
  "@/hooks/useFavoriteTeams": { useFavoriteTeamObjects: () => [team("BOS")] },
  "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: team("BOS") }) },
  "@/hooks/useRemoteData": { useRemoteData: () => ({
    data: { feeds: { NBA: { items: LEAGUE_TITLES.map((title, index) => ({
      title, safeTitle: title, link: `https://example.com/league-${index}`,
      pubDate: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
      source: "Wire", isSpoiler: false, category: "general",
    })), error: false } } },
    loading: false, error: false, retry() {},
  }) },
  "@/lib/news": newsLib,
  "@/lib/teams": teamsLib,
}).default;

test("the league list filters the focus team before it keeps six", () => {
  // Nine stories, the first three about Boston. Filter, then slice(0, 6), keeps six,
  // including original items 7 and 8. Cutting to six first would leave only three.
  shownLeagueTitles = [];
  renderToStaticMarkup(createElement(homePage));
  const actual = Array.from(shownLeagueTitles, (title) => String(title));
  assert.deepEqual(actual, LEAGUE_TITLES.slice(3));
  assert.equal(actual.length, 6);
  assert.equal(actual.includes(LEAGUE_TITLES[6]), true);
  assert.equal(actual.includes(LEAGUE_TITLES[7]), true);
  for (const title of actual) assert.equal(headlineIsAboutTeam(title, team("BOS")), false, title);
});

test("the full edition keeps Around the league lines about the focus team", () => {
  assert.equal(presentation.omitTeamFromLeagueSection, undefined);
  const content = [
    "Boston opened with a win.",
    "",
    "## Around the league",
    "The Celtics and the Nets decided it late.",
    "The Knicks won in Miami.",
    "",
    "## Sources",
    "League date: 2026-10-26",
  ].join("\n");
  const result = presentation.getDigestPresentation({
    date: "2026-10-27", style: "analytical", title: "NBA Morning Briefing: 2026-10-27", content,
    games_covered: ["BKN 110-121 BOS"], stats_highlighted: [],
    metadata: { model: "test", generation_time_ms: 1 }, created_at: "2026-10-27T12:00:00.000Z",
  });
  assert.match(result.content, /The Celtics and the Nets decided it late/);
  assert.match(result.content, /The Knicks won in Miami/);
  assert.doesNotMatch(result.content, /League date/);
  assert.equal(result.coverageDate, "2026-10-26");
});

const editionRef = { current: null };
const settingsRef = { current: { hideScores: true, hideHeadlines: true } };
const focusRef = { current: team("BOS") };

function reactHooks({ forceReveal = false } = {}) {
  return new Proxy(ReactCJS, {
    apply(target, thisArg, args) { return Reflect.apply(target, thisArg, args); },
    get(target, prop, receiver) {
      if (prop === "useState") {
        return (initial) => {
          if (initial === "loading") return ["ready", () => {}];
          if (initial === null) return [editionRef.current, () => {}];
          if (forceReveal && initial === false) return [true, () => {}];
          return [initial, () => {}];
        };
      }
      if (prop === "useEffect") return () => {};
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

const spoilerMock = {
  digestContentIsProtected,
  useSpoilerContext: () => settingsRef.current,
};
const sectionImports = {
  "@/hooks/useRemoteData": { useRemoteData: () => ({ data: null }) },
  "@/lib/nbaDate": dates,
  "@/hooks/useGameData": { useGameData: () => ({ nextGame: null, record: { wins: 29, losses: 15 }, loading: false, error: false }) },
  "@/hooks/useTeam": { useTeam: () => ({ selectedTeam: focusRef.current }) },
  "./SpoilerModeProvider": spoilerMock,
  "@/lib/api": api,
  "next/link": { default: "a" },
  "@/lib/teams": teamsLib,
  "@/lib/digest": digestLib,
};
const readyCard = load("components/GameSection.tsx", {
  ...sectionImports,
  react: reactHooks(),
  "./GoogleCalendarLink": { default: () => null },
  "./ScoreReveal": load("components/ScoreReveal.tsx", { "./SpoilerModeProvider": spoilerMock }),
}).HomeDigestCard;
const revealedCard = load("components/GameSection.tsx", {
  ...sectionImports,
  react: reactHooks(),
  "./GoogleCalendarLink": { default: () => null },
  "./ScoreReveal": load("components/ScoreReveal.tsx", {
    react: reactHooks({ forceReveal: true }),
    "./SpoilerModeProvider": spoilerMock,
  }),
}).HomeDigestCard;
const loadingCard = load("components/GameSection.tsx", {
  ...sectionImports,
  "./GoogleCalendarLink": { default: () => null },
  "./ScoreReveal": load("components/ScoreReveal.tsx", { "./SpoilerModeProvider": spoilerMock }),
}).HomeDigestCard;

const HOME_EDITION = {
  digest: {
    date: "2026-10-27",
    content: "League date: 2026-10-26\nCeltics are 29-15.\nCampanha atual: 29-15.",
    games_covered: ["BKN 110-121 BOS", "BKN 110-121 BOS", "MIA 99-110 NYK"],
  },
  isToday: true,
};
const CELTICS_LINE = "O Boston Celtics venceu o Brooklyn Nets por 121 a 110.";
const KNICKS_LINE = "O New York Knicks venceu o Miami Heat por 110 a 99.";

function renderCard(Component) {
  editionRef.current = HOME_EDITION;
  focusRef.current = team("BOS");
  return renderToStaticMarkup(createElement(Component, { favoriteTeams: [team("BOS"), team("BKN"), team("BOS")] }));
}

test("the first paint of the home digest does not leak a score or a record", () => {
  settingsRef.current = { hideScores: true, hideHeadlines: true };
  const html = renderToStaticMarkup(createElement(loadingCard, { favoriteTeams: [team("BOS"), team("BKN")] }));
  assert.match(html, /Carregando digest/);
  assert.equal(count(html, "121 a 110"), 0);
  assert.doesNotMatch(html, /29-15|29–15|Campanha/);
});

for (const [hideScores, hideHeadlines] of [[false, false], [true, false], [false, true], [true, true]]) {
  test(`home digest shell hideScores=${hideScores} hideHeadlines=${hideHeadlines}`, () => {
    settingsRef.current = { hideScores, hideHeadlines };
    const html = renderCard(readyCard);
    assert.doesNotMatch(visibleText(html), RECORD);
    assert.doesNotMatch(html, /29-15|29–15|Campanha/);
    if (hideScores || hideHeadlines) {
      assert.match(html, /Revelar resultados do digest/);
      assert.equal(count(html, CELTICS_LINE), 0);
      assert.equal(count(html, "121 a 110"), 0);
      return;
    }
    assert.equal(count(html, CELTICS_LINE), 1);
    assert.doesNotMatch(html, /não jogou/);
    const leagueAt = html.indexOf("Pelo resto da liga");
    assert.ok(leagueAt > html.indexOf(CELTICS_LINE));
    assert.equal(count(html.slice(0, leagueAt), "Brooklyn Nets"), 1);
    assert.equal(count(html.slice(leagueAt), "Brooklyn Nets"), 0);
    assert.equal(count(html.slice(leagueAt), "Boston Celtics"), 0);
    assert.equal(count(html, KNICKS_LINE), 1);
  });
}

test("a revealed home digest shows the score once and still hides the W-L record", () => {
  for (const settings of [
    { hideScores: false, hideHeadlines: true },
    { hideScores: true, hideHeadlines: false },
    { hideScores: true, hideHeadlines: true },
  ]) {
    settingsRef.current = settings;
    const html = renderCard(revealedCard);
    assert.match(html, /Ocultar resultados do digest/);
    assert.equal(count(html, CELTICS_LINE), 1, JSON.stringify(settings));
    assert.equal(count(html, KNICKS_LINE), 1, JSON.stringify(settings));
    assert.doesNotMatch(html, /29-15|29–15|Campanha/);
    assert.doesNotMatch(visibleText(html), RECORD);
  }
});

test("malformed covered games do not invent a result or a record", () => {
  settingsRef.current = { hideScores: false, hideHeadlines: false };
  editionRef.current = {
    digest: { date: "2026-10-27", content: "Celtics are 29-15.", games_covered: ["not-a-game", "BOS vs BKN"] },
    isToday: true,
  };
  const html = renderToStaticMarkup(createElement(readyCard, { favoriteTeams: [team("BOS"), team("BKN")] }));
  assert.match(html, /Esta edição não traz informações de jogo do Boston Celtics/);
  assert.match(html, /Esta edição não traz informações de jogo do Brooklyn Nets/);
  assert.doesNotMatch(html, /29-15|29–15|Campanha|venceu|não jogou/);
});

const digestPage = load("app/digest/page.tsx", {
  "@/components/MarkdownContent": load("components/MarkdownContent.tsx"),
  "@/components/DataError": load("components/DataError.tsx"),
  "@/components/SpoilerModeProvider": spoilerMock,
  "@/hooks/useRemoteData": { useRemoteData: (url) => {
    if (url === "/api/digest") return { data: { digest: DIGEST_ENTRY, isToday: true }, loading: false, error: false, retry() {} };
    if (String(url).includes("range=")) return { data: { digests: [] }, loading: false, error: false, retry() {} };
    return { data: { feedback: [] }, loading: false, error: false, retry() {} };
  } },
  "@/lib/nbaDate": dates,
  "@/lib/digestPresentation": presentation,
}).default;

const DIGEST_ENTRY = {
  date: "2026-10-27",
  style: "analytical",
  title: "NBA Morning Briefing: 2026-10-27",
  content: [
    "The Celtics and the Nets decided it late.",
    "",
    "## Around the league",
    "The Celtics and the Nets were the headline.",
    "Celtics are 29-15.",
    "",
    "## Sources",
    "League date: 2026-10-26",
  ].join("\n"),
  games_covered: ["BKN 110-121 BOS", "BKN 110-121 BOS", "MIA 99-110 NYK"],
  stats_highlighted: [],
  metadata: { model: "test", generation_time_ms: 1 },
  created_at: "2026-10-27T12:00:00.000Z",
};

function renderDigest() {
  return renderToStaticMarkup(createElement(digestPage));
}

for (const [hideScores, hideHeadlines] of [[false, false], [true, false], [false, true], [true, true]]) {
  test(`digest page hideScores=${hideScores} hideHeadlines=${hideHeadlines}`, () => {
    settingsRef.current = { hideScores, hideHeadlines };
    const html = renderDigest();
    if (hideScores || hideHeadlines) {
      assert.match(html, /NBA daily breakdown/);
      assert.match(html, /Reveal digest/);
      assert.equal(count(html, "BKN 110-121 BOS"), 0);
      assert.equal(count(html, "MIA 99-110 NYK"), 0);
      assert.equal(count(html, "29-15"), 0);
      assert.equal(count(html, "Around the league"), 0);
      assert.doesNotMatch(visibleText(html), RECORD);
      return;
    }
    assert.equal(count(html, "BKN 110-121 BOS"), 2);
    assert.equal(count(html, "MIA 99-110 NYK"), 1);
    assert.match(html, /Around the league/);
    assert.match(html, /The Celtics and the Nets were the headline/);
    assert.match(html, /Celtics are 29-15/);
  });
}
