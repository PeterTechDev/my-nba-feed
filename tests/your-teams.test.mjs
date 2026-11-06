import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

function load(file, imports = {}, globals = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = {
    ...globals,
    exports,
    require: (id) => imports[id] ?? require(id),
  };
  vm.runInNewContext(code, scope);
  return exports;
}

const teams = load("lib/teams.ts");
const events = load("lib/productEvents.ts");
const yourTeams = load("lib/yourTeams.ts", { "./teams": teams, "./productEvents": events });
const { YourTeamsForm } = load("components/YourTeamsDialog.tsx", {
  "@/lib/teams": teams,
  "@/lib/yourTeams": yourTeams,
  "@/lib/productEvents": events,
  "@/hooks/useTeam": { useTeam: () => ({}) },
  "@/hooks/useFavoriteTeams": { useFavoriteTeams: () => ({}) },
  "./Modal": { default: () => null },
});

const celtics = teams.getCeltics();
const lakers = teams.teams.find((team) => team.abbreviation === "LAL");
const heat = teams.teams.find((team) => team.abbreviation === "MIA");
const knicks = teams.teams.find((team) => team.abbreviation === "NYK");

test("Done shows the save error when storage access or reading is denied", () => {
  for (const deniedAt of ["access", "read"]) {
    const state = [];
    let closed = false;
    let writes = 0;
    let hydrations = 0;
    const storage = {
      getItem() { throw new Error("SecurityError: storage denied"); },
      setItem() { writes += 1; },
      removeItem() { writes += 1; },
    };
    const window = {
      get localStorage() {
        if (deniedAt === "access") throw new Error("SecurityError: storage denied");
        return storage;
      },
    };
    const store = (value) => Object.assign((select) => select(value), {
      getState: () => value,
      persist: { rehydrate() { hydrations += 1; } },
    });
    const { default: Dialog } = load("components/YourTeamsDialog.tsx", {
      react: {
        useState(initial) {
          const index = state.length;
          state.push(initial);
          return [initial, (value) => { state[index] = value; }];
        },
        useRef: () => ({ current: null }),
        useLayoutEffect() {},
      },
      "@/lib/teams": teams,
      "@/lib/yourTeams": yourTeams,
      "@/lib/productEvents": { recordProductEvent() { assert.fail("failed saves must not emit events"); } },
      "@/hooks/useTeam": { useTeam: store({ selectedTeam: heat }) },
      "@/hooks/useFavoriteTeams": { useFavoriteTeams: store({ favoriteTeamIds: [lakers.id] }) },
      "./Modal": { default: () => null },
    }, { window });
    const dialog = Dialog({ onClose() { closed = true; } });
    const form = dialog.props.children.props.children[1];
    assert.doesNotThrow(() => form.props.onDone(), deniedAt);
    assert.equal(state[2], true, "save error is visible");
    assert.equal(state[4], heat.id, "focus draft is preserved");
    assert.deepEqual(state[5], [lakers.id], "following draft is preserved");
    assert.equal(closed, false);
    assert.equal(writes, 0);
    assert.equal(hydrations, 0);
  }
});

function renderForm(props) {
  return renderToStaticMarkup(createElement(YourTeamsForm, {
    ready: true,
    picking: false,
    focusId: celtics.id,
    followingIds: [],
    saveError: false,
    onOpenPicker: () => {},
    onBack: () => {},
    onPick: () => {},
    onToggle: () => {},
    onDone: () => {},
    ...props,
  }));
}

test("Your teams keeps the focus team out of the follow list and reports only real changes", () => {
  const json = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(json(yourTeams.normalizeFollowing([lakers.id, lakers.id, 999, heat.id])), [lakers.id, heat.id]);
  assert.deepEqual(json(yourTeams.normalizeFollowing([])), []);
  assert.deepEqual(json(yourTeams.yourTeamsSaveEvents(
    { focusId: celtics.id, followingIds: [lakers.id] },
    { focusId: heat.id, followingIds: [lakers.id, celtics.id] },
  )), [
    { name: "team_selected", team_id: heat.id, source: "your_teams" },
    { name: "teams_following_updated", count: 2 },
  ]);
  assert.deepEqual(json(yourTeams.yourTeamsSaveEvents(
    { focusId: heat.id, followingIds: [lakers.id] },
    { focusId: heat.id, followingIds: [] },
  )), [{ name: "teams_following_updated", count: 0 }]);
  assert.deepEqual(json(yourTeams.yourTeamsSaveEvents(
    { focusId: celtics.id, followingIds: [] },
    { focusId: celtics.id, followingIds: [] },
  )), []);
});

test("product events stay in process and name no analytics service", () => {
  const seen = [];
  const unsubscribe = events.subscribeProductEvents((event) => seen.push(event));
  events.recordProductEvent({ name: "team_selected", team_id: celtics.id, source: "your_teams" });
  events.recordProductEvent({ name: "teams_following_updated", count: 0 });
  unsubscribe();
  events.recordProductEvent({ name: "teams_following_updated", count: 3 });
  assert.deepEqual(seen, [
    { name: "team_selected", team_id: celtics.id, source: "your_teams" },
    { name: "teams_following_updated", count: 0 },
  ]);
  const source = readFileSync(new URL("../src/lib/productEvents.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch|gtag|posthog|plausible|beacon|localStorage|analytics/i);
});

test("the Your teams form states do not revive the parallel team concepts", () => {
  const loading = renderForm({ ready: false });
  assert.match(loading, /Loading your teams/);
  assert.match(loading, /Drives scores, schedule, and briefing\./);
  assert.match(loading, /Headlines only — scores stay tied to your focus team\./);
  assert.doesNotMatch(loading, /Boston Celtics/);

  const empty = renderForm({});
  assert.match(empty, /Your teams|Focus team/);
  assert.match(empty, /No other teams yet\. Add teams to see their headlines\./);
  assert.match(empty, />Done</);
  assert.match(empty, />Change</);
  const beforeCeltics = empty.slice(0, empty.indexOf("Boston Celtics"));
  assert.doesNotMatch(beforeCeltics.slice(-180), /checked/);
  assert.doesNotMatch(empty, /My Teams|Change focus team|Choose your focus team/);

  const followed = renderForm({ focusId: heat.id, followingIds: [lakers.id] });
  assert.match(followed, /Miami Heat/);
  const beforeLakers = followed.slice(0, followed.indexOf("Los Angeles Lakers"));
  assert.match(beforeLakers.slice(-180), /checked/);
  const beforeHeat = followed.slice(0, followed.indexOf("Miami Heat"));
  assert.doesNotMatch(beforeHeat.slice(-180), /checked=""/);

  const failed = renderForm({ saveError: true });
  assert.match(failed, /Couldn&#x27;t save your teams\. Try again\./);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /id="your-teams-done"/);
  assert.doesNotMatch(failed, /id="your-teams-done"[^>]*disabled/);

  const picker = renderForm({ picking: true, focusId: lakers.id });
  assert.match(picker, /role="radiogroup"/);
  assert.match(picker, new RegExp(`aria-checked="true"[^>]*aria-label="Los Angeles Lakers"|aria-label="Los Angeles Lakers"[^>]*aria-checked="true"`));
  assert.match(picker, />Back</);
  assert.doesNotMatch(picker, />Done</);
});

function openPreferences(saved, { failCommit = false } = {}) {
  const writes = [];
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      if (failCommit && key === "nba-feed-your-teams") throw new Error("quota");
      writes.push(key);
      saved.set(key, value);
    },
    removeItem: (key) => saved.delete(key),
  };
  const { persist, createJSONStorage } = require("zustand/middleware");
  const loaded = load("hooks/useTeam.ts", {
    "@/lib/teams": teams,
    "@/lib/yourTeams": yourTeams,
    "zustand/middleware": { persist: (config, options) => persist(config, options), createJSONStorage },
  }, { window: { localStorage: storage } });
  return { store: loaded.useTeam, writes };
}

test("legacy keys hydrate once and never override the authoritative record", () => {
  const legacyFocus = JSON.stringify({ version: 0, state: { selectedTeam: { ...heat, id: 15, logo: "https://cdn.example/legacy.svg" } } });
  const legacyFollows = JSON.stringify({ version: 0, state: { favoriteTeamIds: [12] } });
  const saved = new Map([
    ["nba-feed-team", legacyFocus],
    ["nba-feed-favorite-teams", legacyFollows],
  ]);
  const first = openPreferences(saved);
  assert.equal(first.store.getState().selectedTeam, heat);
  assert.equal(first.store.getState().selectedTeam.logo, heat.logo);
  assert.deepEqual(JSON.parse(JSON.stringify(first.store.getState().favoriteTeamIds)), [13]);
  assert.equal(first.store.getState().favoriteTeamIds.includes(heat.id), false);
  assert.equal(saved.get("nba-feed-team"), legacyFocus);
  assert.equal(saved.get("nba-feed-favorite-teams"), legacyFollows);
  assert.equal(saved.has("nba-feed-your-teams"), false);

  assert.doesNotThrow(() => first.store.getState().commit(knicks, []));
  assert.equal(first.writes.length, 1);
  assert.equal(first.writes[0], "nba-feed-your-teams");
  const record = JSON.parse(saved.get("nba-feed-your-teams"));
  assert.equal(record.state.selectedTeam.abbreviation, "NYK");
  assert.deepEqual(record.state.favoriteTeamIds, []);
  assert.equal(saved.get("nba-feed-team"), legacyFocus);
  assert.equal(saved.get("nba-feed-favorite-teams"), legacyFollows);

  saved.set("nba-feed-team", JSON.stringify({ version: 2, state: { selectedTeam: celtics } }));
  saved.set("nba-feed-favorite-teams", JSON.stringify({ version: 1, state: { favoriteTeamIds: [lakers.id] } }));
  const reloaded = openPreferences(saved);
  assert.equal(reloaded.store.getState().selectedTeam.abbreviation, "NYK");
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.store.getState().favoriteTeamIds)), []);
});

test("a failed Done leaves the saved pair and feed memory unchanged", () => {
  const legacyFocus = JSON.stringify({ version: 2, state: { selectedTeam: heat } });
  const legacyFollows = JSON.stringify({ version: 1, state: { favoriteTeamIds: [lakers.id] } });
  const saved = new Map([
    ["nba-feed-team", legacyFocus],
    ["nba-feed-favorite-teams", legacyFollows],
  ]);
  const opened = openPreferences(saved, { failCommit: true });
  assert.throws(() => opened.store.getState().commit(knicks, []), /quota/);
  assert.equal(opened.store.getState().selectedTeam.abbreviation, "MIA");
  assert.deepEqual(JSON.parse(JSON.stringify(opened.store.getState().favoriteTeamIds)), [lakers.id]);
  assert.equal(saved.has("nba-feed-your-teams"), false);
  assert.equal(saved.get("nba-feed-team"), legacyFocus);
  assert.equal(saved.get("nba-feed-favorite-teams"), legacyFollows);
  const reloaded = openPreferences(saved);
  assert.equal(reloaded.store.getState().selectedTeam.abbreviation, "MIA");
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.store.getState().favoriteTeamIds)), [lakers.id]);
});

test("a failed save lets Esc and Close discard the draft", () => {
  assert.equal(yourTeams.yourTeamsCloseAction({ saveError: true, confirmDiscard: true, dirty: true }), "close");
  assert.equal(yourTeams.yourTeamsCloseAction({ saveError: false, confirmDiscard: false, dirty: true }), "confirm-discard");
  assert.equal(yourTeams.yourTeamsCloseAction({ saveError: false, confirmDiscard: true, dirty: true }), "keep-editing");
  assert.equal(yourTeams.yourTeamsCloseAction({ saveError: false, confirmDiscard: false, dirty: false }), "close");
});

test("stores without browser storage count as ready instead of leaving the dialog loading", () => {
  // zustand omits the persist API entirely when storage is unavailable.
  assert.equal(yourTeams.isStoreReady({}), true);
  assert.equal(yourTeams.isStoreReady({ persist: { hasHydrated: () => true } }), true);
  assert.equal(yourTeams.isStoreReady({ persist: { hasHydrated: () => false } }), false);
});

test("unsaved changes are detected regardless of follow order", () => {
  assert.equal(yourTeams.sameIds([lakers.id, heat.id], [heat.id, lakers.id]), true);
  assert.equal(yourTeams.sameIds([lakers.id], [lakers.id, heat.id]), false);
  assert.equal(yourTeams.sameIds([], []), true);
});

test("the focus picker is a single tab stop on the selected team", () => {
  const picker = renderForm({ picking: true, focusId: lakers.id });
  const tabStops = picker.match(/role="radio"[^>]*tabindex="0"|tabindex="0"[^>]*role="radio"/g) ?? [];
  assert.equal(tabStops.length, 1);
  assert.match(picker, /aria-label="Los Angeles Lakers"[^>]*tabindex="0"|tabindex="0"[^>]*aria-label="Los Angeles Lakers"/);
  assert.equal((picker.match(/role="radio"/g) ?? []).length, teams.teams.length);
});
