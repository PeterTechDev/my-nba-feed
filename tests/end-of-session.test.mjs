import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;
const DOCUMENT_FRAGMENT_NODE = 11;

class DomNode {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.childNodes = [];
    this.parentNode = null;
    this.ownerDocument = null;
    this.nodeValue = null;
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[index + 1] ?? null;
  }
  appendChild(child) { return this.insertBefore(child, null); }
  insertBefore(child, before) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = before == null ? this.childNodes.length : this.childNodes.indexOf(before);
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, child);
    return child;
  }
  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index < 0) throw new Error("NotFoundError");
    this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  addEventListener() {}
  removeEventListener() {}
  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }
}

class DomText extends DomNode {
  constructor(value) {
    super(TEXT_NODE, "#text");
    this.nodeValue = String(value ?? "");
  }
  get textContent() { return this.nodeValue; }
  set textContent(value) { this.nodeValue = String(value ?? ""); }
}

class DomElement extends DomNode {
  constructor(tag, namespaceURI = "http://www.w3.org/1999/xhtml") {
    super(ELEMENT_NODE, String(tag).toUpperCase());
    this.tagName = String(tag).toUpperCase();
    this.namespaceURI = namespaceURI;
    this.attributes = new Map();
    this.style = {};
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  setAttributeNS(_namespace, name, value) { this.setAttribute(name, value); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  get textContent() { return this.childNodes.map((child) => child.textContent ?? "").join(""); }
  set textContent(value) {
    this.childNodes = [];
    if (value != null && value !== "") this.appendChild(this.ownerDocument.createTextNode(String(value)));
  }
}

class DomDocument extends DomNode {
  constructor() {
    super(DOCUMENT_NODE, "#document");
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.head = this.createElement("head");
    this.body = this.createElement("body");
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }
  createElement(tag) {
    const element = new DomElement(tag);
    element.ownerDocument = this;
    return element;
  }
  createElementNS(namespaceURI, tag) {
    const element = new DomElement(tag, namespaceURI);
    element.ownerDocument = this;
    return element;
  }
  createTextNode(value) {
    const node = new DomText(value);
    node.ownerDocument = this;
    return node;
  }
  createComment(value) {
    const node = new DomNode(COMMENT_NODE, "#comment");
    node.nodeValue = String(value ?? "");
    node.ownerDocument = this;
    node.textContent = node.nodeValue;
    return node;
  }
  createDocumentFragment() {
    const fragment = new DomNode(DOCUMENT_FRAGMENT_NODE, "#document-fragment");
    fragment.ownerDocument = this;
    return fragment;
  }
}

const document = new DomDocument();
globalThis.window = globalThis;
globalThis.document = document;
globalThis.HTMLElement = DomElement;
globalThis.Element = DomElement;
globalThis.Node = DomNode;
globalThis.HTMLIFrameElement = class HTMLIFrameElement {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

const { createRoot } = await import("react-dom/client");
const { act } = await import("react");

const NOW = Date.parse("2026-10-27T14:00:00Z");
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
}
const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => imports[id] ?? (id.endsWith(".module.css") ? { default: new Proxy({}, { get: (_target, key) => key }) } : require(id)),
    Date, URL, AbortSignal, Response, Buffer, setTimeout, ...globals,
  });
  return exports;
}

const dates = load("lib/nbaDate.ts", { Date: FixedDate });
const teams = load("lib/teams.ts");
const api = load("lib/api.ts");
const news = load("lib/news.ts", { Date: FixedDate }, { "./api": api, "./teams": teams });
const celtics = teams.getCeltics();
const lakers = teams.teams.find((team) => team.name === "Lakers");
const UP_TO_DATE = "You’re up to date with the Celtics. You can head out.";
const UP_TO_DATE_LIVE = "You’re up to date with the Celtics.";
const UP_TO_DATE_TEAMS = "You’re up to date with your teams.";
const NOTHING_NEW = "Nothing new for the Celtics. You can head out.";

function story(title) {
  return {
    title: `${title} - ESPN`, safeTitle: "Protected recap", source: "ESPN", isSpoiler: false, category: "analysis",
    pubDate: "2026-10-27T12:00:00Z", link: `https://example.com/${encodeURIComponent(title)}`,
  };
}
function gamesResponse(overrides = {}) {
  return { lastGame: null, currentGame: null, nextGame: null, record: { wins: 2, losses: 1 }, error: null, ...overrides };
}
function createPersist(hydrated) {
  let ready = hydrated;
  const listeners = new Set();
  return {
    hasHydrated: () => ready,
    onFinishHydration(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    finish() {
      ready = true;
      for (const listener of listeners) listener();
    },
  };
}
function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}
function roleOf(node) {
  if (node.nodeType !== ELEMENT_NODE) return null;
  const explicit = node.getAttribute("role");
  if (explicit) return explicit;
  if (node.tagName === "SECTION" && node.hasAttribute("aria-label")) return "region";
  if (node.tagName === "BUTTON") return "button";
  if (node.tagName === "A" && node.hasAttribute("href")) return "link";
  return null;
}
function byRole(root, role, name) {
  const matches = [];
  walk(root, (node) => {
    if (roleOf(node) !== role) return;
    if (name !== undefined && node.getAttribute("aria-label") !== name) return;
    matches.push(node);
  });
  return matches;
}
function endMarker(root) {
  return byRole(root, "region", "End of session");
}
function render(element) {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, unmount() { act(() => { root.unmount(); }); } };
}
function renderEnd({ favorites = [], games = {}, feeds = {}, newsError = false, newsLoading = false, hydrated = true } = {}) {
  const favoriteTeams = favorites.map((id) => teams.teams.find((team) => team.id === id));
  const teamPersist = createPersist(hydrated);
  const favoritePersist = createPersist(hydrated);
  const useTeam = () => ({ selectedTeam: celtics });
  useTeam.persist = teamPersist;
  const useFavoriteTeams = () => ({ favoriteTeamIds: favorites });
  useFavoriteTeams.persist = favoritePersist;
  const remote = (url) => {
    if (url.includes("/api/games")) {
      const id = Number(new URL(url, "http://localhost").searchParams.get("teamId"));
      return { retry() {}, loading: false, error: false, data: gamesResponse(), ...games[id] };
    }
    const names = new URL(url, "http://localhost").searchParams.get("teams").split(",");
    return {
      retry() {}, loading: newsLoading, error: newsError,
      data: newsLoading ? null : { feeds: Object.fromEntries(names.map((name) => [name, feeds[name] ?? { items: [], error: false }])) },
    };
  };
  const End = load("components/EndOfSession.tsx", {}, {
    "@/lib/nbaDate": dates, "@/lib/news": news, "@/lib/api": api, "@/lib/teams": teams,
    "@/hooks/useTeam": { useTeam },
    "@/hooks/useFavoriteTeams": { useFavoriteTeams, useFavoriteTeamObjects: () => favoriteTeams },
    "@/hooks/useRemoteData": {
      useRemoteData: remote,
      useRemoteDataAll: (urls) => urls.map((url) => {
        const row = remote(url);
        return { data: row.data, loading: row.loading, error: row.error };
      }),
    },
  }).default;
  const view = render(createElement(End));
  return { ...view, teamPersist, favoritePersist };
}
function markerText(container) {
  const marker = endMarker(container);
  assert.equal(marker.length, 1);
  return marker[0].textContent.trim();
}

const celticsNext = { id: 2, date: "2026-10-27", status: "Scheduled", isHome: true, homeTeam: celtics, awayTeam: { id: 3, name: "Nets", abbreviation: "BKN" }, homeScore: 0, awayScore: 0 };
const celticsLive = { id: 12, date: "2026-10-27", status: "2nd Qtr", isHome: true, homeTeam: { id: celtics.id, name: "Celtics", abbreviation: "BOS" }, awayTeam: { id: 3, name: "Nets", abbreviation: "BKN" }, homeScore: 40, awayScore: 38 };
const lakersLive = { id: 11, date: "2026-10-27", status: "1st Qtr", isHome: true, homeTeam: { id: lakers.id, name: "Lakers", abbreviation: "LAL" }, awayTeam: { id: celtics.id, name: "Celtics", abbreviation: "BOS" }, homeScore: 24, awayScore: 20 };
const lakersLastNight = { id: 9, date: "2026-10-26", status: "Final", isHome: true, homeTeam: { id: lakers.id, name: "Lakers", abbreviation: "LAL" }, awayTeam: { id: 2, name: "Celtics", abbreviation: "BOS" }, homeScore: 110, awayScore: 101 };

test("end marker stays hidden while games or news are still loading", () => {
  const loadingGames = renderEnd({ games: { [celtics.id]: { loading: true, data: gamesResponse({ nextGame: celticsNext }) } }, feeds: { Celtics: { items: [story("Celtics opener")], error: false } } });
  const loadingNews = renderEnd({ newsLoading: true, games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) } } });
  try {
    assert.equal(endMarker(loadingGames.container).length, 0);
    assert.equal(endMarker(loadingNews.container).length, 0);
    assert.doesNotMatch(loadingGames.container.textContent, /up to date|Nothing new|head out/);
    assert.doesNotMatch(loadingNews.container.textContent, /up to date|Nothing new|head out/);
  } finally {
    loadingGames.unmount();
    loadingNews.unmount();
  }
});

test("end marker stays hidden when games or news fail", () => {
  const failedGames = renderEnd({ games: { [celtics.id]: { error: true, data: gamesResponse({ nextGame: celticsNext }) } }, feeds: { Celtics: { items: [story("Celtics opener")], error: false } } });
  const failedNews = renderEnd({ newsError: true, games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) } } });
  const failedFeed = renderEnd({ games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) } }, feeds: { Celtics: { items: [story("Celtics opener")], error: true } } });
  try {
    for (const view of [failedGames, failedNews, failedFeed]) {
      assert.equal(endMarker(view.container).length, 0);
      assert.doesNotMatch(view.container.textContent, /up to date|Nothing new|head out/);
    }
  } finally {
    failedGames.unmount();
    failedNews.unmount();
    failedFeed.unmount();
  }
});

test("one covered team is named in the up-to-date marker", () => {
  const view = renderEnd({ games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) } }, feeds: { Celtics: { items: [story("Celtics opener")], error: false } } });
  try {
    assert.equal(markerText(view.container), UP_TO_DATE);
    assert.match(markerText(view.container), new RegExp(celtics.name));
  } finally {
    view.unmount();
  }
});

test("several covered teams share one up-to-date marker", () => {
  const view = renderEnd({
    favorites: [celtics.id, lakers.id],
    games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) }, [lakers.id]: { data: gamesResponse() } },
    feeds: { Celtics: { items: [story("Celtics opener")], error: false }, Lakers: { items: [story("Lakers opener")], error: false } },
  });
  try {
    assert.equal(markerText(view.container), UP_TO_DATE_TEAMS);
    assert.doesNotMatch(markerText(view.container), new RegExp(`the ${celtics.name}|the ${lakers.name}`));
  } finally {
    view.unmount();
  }
});

test("an NBA-only feed still counts as nothing new for the selected team", () => {
  const league = story("League notebook");
  const feeds = { Celtics: { items: [], error: false }, NBA: { items: [league], error: false } };
  const selected = news.selectHomepageNews(feeds, ["Celtics", "NBA"]);
  assert.equal(selected.Celtics.items.length, 0);
  assert.equal(selected.NBA.items[0].link, league.link);
  const view = renderEnd({ favorites: [celtics.id], games: { [celtics.id]: { data: gamesResponse() } }, feeds });
  try {
    assert.equal(markerText(view.container), NOTHING_NEW);
    assert.doesNotMatch(view.container.textContent, /up to date|League notebook/);
  } finally {
    view.unmount();
  }
});

test("a favorite outside the focus keeps the marker hidden when its games request failed", () => {
  assert.equal(dates.gameDaysAgo(lakersLastNight.date), 1);
  const view = renderEnd({
    favorites: [lakers.id],
    games: {
      [celtics.id]: { data: gamesResponse() },
      [lakers.id]: { error: true, data: gamesResponse({ lastGame: lakersLastNight }) },
    },
    feeds: { Celtics: { items: [], error: false }, Lakers: { items: [], error: false }, NBA: { items: [], error: false } },
  });
  try {
    assert.equal(endMarker(view.container).length, 0);
    assert.doesNotMatch(view.container.textContent, /up to date|Nothing new|head out|Lakers/);
  } finally {
    view.unmount();
  }
});

test("a live favorite counts when the focus has no game and no team news", () => {
  const view = renderEnd({
    favorites: [lakers.id],
    games: {
      [celtics.id]: { data: gamesResponse() },
      [lakers.id]: { data: gamesResponse({ currentGame: lakersLive }) },
    },
    feeds: { Celtics: { items: [], error: false }, Lakers: { items: [], error: false }, NBA: { items: [], error: false } },
  });
  try {
    assert.equal(markerText(view.container), UP_TO_DATE_TEAMS);
    assert.doesNotMatch(view.container.textContent, /Nothing new|head out/);
  } finally {
    view.unmount();
  }
});

test("a live focus team is up to date without being told to head out", () => {
  const view = renderEnd({
    games: { [celtics.id]: { data: gamesResponse({ currentGame: celticsLive }) } },
    feeds: { Celtics: { items: [], error: false } },
  });
  try {
    assert.equal(markerText(view.container), UP_TO_DATE_LIVE);
    assert.doesNotMatch(view.container.textContent, /head out/);
  } finally {
    view.unmount();
  }
});

test("end marker waits until both saved preference stores have hydrated", () => {
  const view = renderEnd({ hydrated: false, games: { [celtics.id]: { data: gamesResponse({ nextGame: celticsNext }) } }, feeds: { Celtics: { items: [story("Celtics opener")], error: false } } });
  try {
    assert.equal(endMarker(view.container).length, 0);
    act(() => { view.teamPersist.finish(); });
    assert.equal(endMarker(view.container).length, 0);
    act(() => { view.favoritePersist.finish(); });
    assert.equal(markerText(view.container), UP_TO_DATE);
  } finally {
    view.unmount();
  }
});

test("homepage places the end marker after the last story, names the selected team, and offers no load more or search after it", () => {
  const focus = celtics;
  const stories = ["Celtics opener", "Celtics middle", "Celtics nightcap"].map(story);
  const state = { currentGame: null, lastGame: null, record: { wins: 2, losses: 1 }, loading: false, error: null,
    nextGame: { date: "2026-10-27", status: "Scheduled", isHome: true, homeTeam: focus, awayTeam: { name: "Nets", abbreviation: "BKN" }, homeScore: 0, awayScore: 0 } };
  const useTeam = () => ({ selectedTeam: focus });
  useTeam.persist = createPersist(true);
  const useFavoriteTeams = () => ({ favoriteTeamIds: [] });
  useFavoriteTeams.persist = createPersist(true);
  const remote = (url) => ({ loading: false, error: false, retry() {},
    data: url.includes("/api/games") ? state : { feeds: Object.fromEntries(new URL(url, "http://localhost").searchParams.get("teams").split(",").map((name) => [name, { items: name === focus.name ? stories : [], error: false }])) } });
  const mocked = {
    "next/link": { default: "a" },
    "@/lib/nbaDate": dates, "@/lib/api": api, "@/lib/teams": teams, "@/lib/news": news,
    "@/hooks/useFavoriteTeams": { useFavoriteTeams, useFavoriteTeamObjects: () => [] },
    "@/hooks/useTeam": { useTeam },
    "@/hooks/useGameData": { useGameData: () => state },
    "@/hooks/useLastVisit": { useLastVisit: () => ({ ready: true, lastVisitAt: null }) },
    "@/hooks/useRemoteData": { useRemoteData: remote, useRemoteDataAll: (urls) => urls.map((url) => { const row = remote(url); return { data: row.data, loading: row.loading, error: row.error }; }) },
    "./SpoilerModeProvider": { useSpoilerContext: () => ({ hideScores: false, hideHeadlines: false }) },
  };
  mocked["./DataError"] = load("components/DataError.tsx");
  mocked["./ScoreReveal"] = load("components/ScoreReveal.tsx", {}, mocked);
  mocked["./NewsList"] = load("components/NewsList.tsx", {}, mocked);
  for (const name of ["GameDayHero", "GameSection", "MorningBriefingCard", "PersonalizedFeed", "NewsFeed", "TopPlaysCard", "EndOfSession"]) {
    mocked["@/components/" + name] = load("components/" + name + ".tsx", {}, mocked);
  }
  mocked["@/components/TeamHeader"] = { default: () => null };
  mocked["@/components/GameDataProvider"] = { default: ({ children }) => children };
  const view = render(createElement(load("app/page.tsx", {}, mocked).default));
  try {
    const order = [];
    walk(view.container, (node) => order.push(node));
    const marker = endMarker(view.container);
    assert.equal(marker.length, 1);
    assert.equal(marker[0].textContent.trim(), UP_TO_DATE);
    const markerAt = order.indexOf(marker[0]);
    const nightcap = order.find((node) => node.nodeType === TEXT_NODE && node.nodeValue.includes("Celtics nightcap"));
    const search = order.find((node) => node.nodeType === ELEMENT_NODE && (node.getAttribute("aria-label") || "").includes("Search"));
    assert.ok(nightcap, "last story is in the feed");
    assert.ok(search, "matchup search stays available before the session ends");
    assert.ok(order.indexOf(nightcap) < markerAt);
    assert.ok(order.indexOf(search) < markerAt);
    const trailing = order.filter((node) => {
      if (order.indexOf(node) <= markerAt) return false;
      let parent = node;
      while (parent) {
        if (parent === marker[0]) return false;
        parent = parent.parentNode;
      }
      return true;
    }).map((node) => node.nodeType === TEXT_NODE ? node.nodeValue : `${node.getAttribute?.("aria-label") || ""} ${node.getAttribute?.("href") || ""} ${node.getAttribute?.("title") || ""}`).join("\n");
    assert.equal(trailing.trim(), "");
    assert.doesNotMatch(trailing, /carregar mais|load more|search/i);
  } finally {
    view.unmount();
  }
});
