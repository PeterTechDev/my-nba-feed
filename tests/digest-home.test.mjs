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

function spoilerFigure() {
  const source = readFileSync(new URL("../src/lib/teams.ts", import.meta.url), "utf8");
  const line = source.split("\n").find((entry) => entry.startsWith("const SPOILER_FIGURE = "));
  assert.ok(line, "SPOILER_FIGURE lives in src/lib/teams.ts");
  const expression = line.slice(line.indexOf("=") + 1).trim().replace(/;$/, "");
  return Function(`"use strict"; return (${expression});`)();
}

const SPOILER_FIGURE = spoilerFigure();
const team = (abbreviation) => {
  const found = teams.find((entry) => entry.abbreviation === abbreviation);
  assert.ok(found, abbreviation);
  return found;
};
const count = (html, needle) => html.split(needle).length - 1;
const visibleText = (html) => html.replace(/datetime="[^"]*"/gi, "").replace(/<[^>]+>/g, " ");
const RECORD = /\b\d{1,2}[–—-]\d{1,2}\b/;

// Locked to 4399b6c. Two cells differ from the 9183b88 explorer matrix;
// both are the same at c6159a8 and 4399b6c.
const MATRIX = [
  { h: "Celtics edge Nets 121-115 behind late run", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Celtics star Jayson Tatum listed as questionable with ankle injury", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Boston rallies past Brooklyn 121-115", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Knicks top Heat; Celtics loom next on schedule", BOS: false, BKN: false, NYK: true, LAL: false, LAC: false },
  { h: "C's hold off Nets in overtime thriller", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Jayson Tatum drops 40 in overtime win", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "CELTICS ROUT NETS AT TD GARDEN", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "celtics' bench shines in comeback", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Boston Marathon organizers announce 2027 route", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Nets trade Cam Thomas to Celtics in three-team deal", BOS: false, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "New York Knicks win 110-104 at Brooklyn", BOS: false, BKN: true, NYK: true, LAL: false, LAC: false },
  { h: "Los Angeles beats Sacramento 118-104", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "LA Clippers sign veteran guard", BOS: false, BKN: false, NYK: false, LAL: false, LAC: true },
  { h: "Takeaways: How the Celtics held off the Nets in OT", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Nets fall to Celtics 115-121", BOS: true, BKN: true, NYK: false, LAL: false, LAC: false },
  { h: "Lakers trade talk heats up", BOS: false, BKN: false, NYK: false, LAL: true, LAC: false },
  // 9183b88 had BKN false. The pair "Knicks and Nets" counts for both teams.
  { h: "Knicks and Nets renew New York rivalry", BOS: false, BKN: true, NYK: true, LAL: false, LAC: false },
  { h: "Boston College stuns Duke 78-70", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Red Sox, Celtics share Boston spotlight", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  // 9183b88 had BOS false. A 3-1 record in the same clause counts.
  { h: "Why the Celtics are 3-1", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "Cs win again", BOS: false, BKN: false, NYK: false, LAL: false, LAC: false },
  { h: "The Celtics' Jayson Tatum: 'We needed that'", BOS: true, BKN: false, NYK: false, LAL: false, LAC: false },
];

const COLUMNS = ["BOS", "BKN", "NYK", "LAL", "LAC"];

for (const row of MATRIX) {
  test(`headline: ${row.h}`, () => {
    for (const abbreviation of COLUMNS) {
      assert.equal(headlineIsAboutTeam(row.h, team(abbreviation)), row[abbreviation], `${row.h} / ${abbreviation}`);
    }
  });
}

const EDGES = [
  ["CELTICS", { BOS: true, BKN: false }],
  ["celtics", { BOS: true }],
  ["CeLtIcS rout", { BOS: true, BKN: false }],
  ["Celtics'", { BOS: true }],
  ["celtics' bench shines", { BOS: true, BKN: false }],
  ["The Celtics' Jayson Tatum", { BOS: true, BKN: false }],
  ["Netsuke exhibition opens", { BKN: false, BOS: false }],
  ["Netsuke exhibition opens in Boston", { BKN: false, BOS: false }],
  ["Heated rivalry talk", { MIA: false }],
  ["Heat win again", { MIA: true, BOS: false }],
  ["The Heat win", { MIA: true }],
  ["LA", { LAL: false, LAC: false }],
  ["Los Angeles", { LAL: false, LAC: false }],
  ["LA Lakers sign a guard", { LAL: true, LAC: false }],
  ["LA Clippers sign a guard", { LAL: false, LAC: true }],
  ["Los Angeles Lakers host the Clippers", { LAL: true, LAC: false }],
  ["Los Angeles Clippers and Lakers trade", { LAL: true, LAC: true }],
  ["New York", { NYK: true, BKN: false }],
  ["Brooklyn", { BKN: true, NYK: false }],
  ["Celtics and Lakers open a back-to-back", { BOS: true, LAL: true, LAC: false }],
  ["Celtics 12-3", { BOS: true }],
  ["Notes: the Celtics are 12-3", { BOS: true }],
  ["Notes: the Celtics are 29-15", { BOS: true }],
  ["Notes: Celtics visit on 10/26", { BOS: false }],
  ["Notes: Celtics visit on 10-26-2026", { BOS: false }],
  ["Notes: Celtics tip at 8:30", { BOS: false }],
];

for (const [headline, expected] of EDGES) {
  test(`edge: ${headline}`, () => {
    for (const [abbreviation, value] of Object.entries(expected)) {
      assert.equal(headlineIsAboutTeam(headline, team(abbreviation)), value, `${headline} / ${abbreviation}`);
    }
  });
}

describe("regra do and / número por oração", () => {
  test("Warriors and Lakers talk trade as Celtics watch is not about Boston", () => {
    const headline = "Warriors and Lakers talk trade as Celtics watch";
    assert.equal(headlineIsAboutTeam(headline, team("BOS")), false);
    assert.equal(headlineIsAboutTeam(headline, team("GSW")), true);
    assert.equal(headlineIsAboutTeam(headline, team("LAL")), true);
  });

  test("Pistons and Bulls swap guards; Celtics next? is not about Boston", () => {
    const headline = "Pistons and Bulls swap guards; Celtics next?";
    assert.equal(headlineIsAboutTeam(headline, team("BOS")), false);
    assert.equal(headlineIsAboutTeam(headline, team("DET")), true);
    assert.equal(headlineIsAboutTeam(headline, team("CHI")), true);
  });

  test("Heat wave and Celtics fans is not about Miami", () => {
    assert.equal(headlineIsAboutTeam("Heat wave and Celtics fans", team("MIA")), false);
  });

  test("Magic Johnson and Celtics legends is not about Orlando", () => {
    assert.equal(headlineIsAboutTeam("Magic Johnson and Celtics legends", team("ORL")), false);
  });

  test("a score in another clause is not a Celtics spoiler", () => {
    // headlineIsAboutTeam decides this. It runs SPOILER_FIGURE on each clause
    // (clausesOf is private). The raw title still contains 101-98.
    const headline = "Knicks beat Heat 101-98; Celtics rest Tatum";
    assert.equal(SPOILER_FIGURE.test(headline), true);
    assert.equal(SPOILER_FIGURE.test("101-98"), true);
    assert.equal(SPOILER_FIGURE.test("Celtics rest Tatum"), false);
    assert.equal(headlineIsAboutTeam(headline, team("BOS")), false);
    assert.equal(headlineIsAboutTeam(headline, team("NYK")), true);
    assert.equal(headlineIsAboutTeam(headline, team("MIA")), true);
  });
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

describe("known-gap observação", () => {
  test("another sport in Boston currently matches the Celtics", () => {
    // known-gap: observação — falso positivo atual, sem decidir se é bug.
    assert.equal(headlineIsAboutTeam("Boston Marathon organizers announce 2027 route", team("BOS")), true);
    assert.equal(headlineIsAboutTeam("Boston College stuns Duke 78-70", team("BOS")), true);
  });

  test("a named team off the start, without a figure or an adjacent pair, stays false", () => {
    // known-gap: observação — falso negativo atual.
    assert.equal(headlineIsAboutTeam("Nets trade Cam Thomas to Celtics in three-team deal", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("Takeaways: How the Celtics held off the Nets in OT", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("Takeaways: How the Celtics held off the Nets in OT", team("BKN")), false);
    assert.equal(headlineIsAboutTeam("Red Sox, Celtics share Boston spotlight", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("CELTICS ROUT NETS AT TD GARDEN", team("BKN")), false);
  });

  test("a bare month-day currently counts as a record", () => {
    // known-gap: observação — "10-26" cai em \\d{1,2}-\\d{1,2}. "10-26-2026" não.
    assert.equal(SPOILER_FIGURE.test("10-26"), true);
    assert.equal(SPOILER_FIGURE.test("10-26-26"), true);
    assert.equal(headlineIsAboutTeam("Notes: Celtics visit on 10-26", team("BOS")), true);
  });

  test("an ampersand pair does not keep the team on the right", () => {
    // suspicious: c6159a8 returned true for BKN. textTokens strips "&" before the pair check.
    assert.equal(headlineIsAboutTeam("Knicks & Nets", team("NYK")), true);
    assert.equal(headlineIsAboutTeam("Knicks & Nets", team("BKN")), false);
  });

  test("Celtics named beside a non-club and-side stay false", () => {
    // suspicious: c6159a8 returned true for BOS. 4399b6c requires a club on the other side.
    assert.equal(headlineIsAboutTeam("Heat wave and Celtics fans", team("BOS")), false);
    assert.equal(headlineIsAboutTeam("Magic Johnson and Celtics legends", team("BOS")), false);
  });
});

test("SPOILER_FIGURE matches records and scores and rejects dates and clock times", () => {
  for (const sample of ["3-1", "29-15", "12-3", "121-115", "121\u2013115", "99\u2014101", "0-1"]) {
    assert.equal(SPOILER_FIGURE.test(sample), true, sample);
  }
  for (const sample of ["10/26", "10-26-2026", "8:30", "8:30 pm"]) {
    assert.equal(SPOILER_FIGURE.test(sample), false, sample);
  }
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
const presentation = load("lib/digestPresentation.ts", { "@/lib/nbaDate": dates, "@/lib/digest": digestLib });

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
  "./ScoreReveal": load("components/ScoreReveal.tsx", { "./SpoilerModeProvider": spoilerMock }),
}).HomeDigestCard;
const revealedCard = load("components/GameSection.tsx", {
  ...sectionImports,
  react: reactHooks(),
  "./ScoreReveal": load("components/ScoreReveal.tsx", {
    react: reactHooks({ forceReveal: true }),
    "./SpoilerModeProvider": spoilerMock,
  }),
}).HomeDigestCard;
const loadingCard = load("components/GameSection.tsx", {
  ...sectionImports,
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
  assert.match(html, /O Boston Celtics não jogou nesta rodada/);
  assert.match(html, /O Brooklyn Nets não jogou nesta rodada/);
  assert.doesNotMatch(html, /29-15|29–15|Campanha|venceu/);
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
