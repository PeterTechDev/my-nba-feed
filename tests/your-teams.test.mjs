import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

function load(file, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = {
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

  const picker = renderForm({ picking: true, focusId: lakers.id });
  assert.match(picker, /role="radiogroup"/);
  assert.match(picker, new RegExp(`aria-checked="true"[^>]*aria-label="Los Angeles Lakers"|aria-label="Los Angeles Lakers"[^>]*aria-checked="true"`));
  assert.match(picker, />Back</);
  assert.doesNotMatch(picker, />Done</);
});

test("saved focus and follow preferences reload without forcing the focus onto follows", () => {
  const { persist, createJSONStorage } = require("zustand/middleware");
  const saved = new Map([
    ["nba-feed-team", JSON.stringify({ version: 2, state: { selectedTeam: heat } })],
    ["nba-feed-favorite-teams", JSON.stringify({ version: 1, state: { favoriteTeamIds: [lakers.id] } })],
  ]);
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  };
  const middleware = { persist: (config, options) => persist(config, { ...options, storage: createJSONStorage(() => storage) }) };
  const useTeam = load("hooks/useTeam.ts", { "@/lib/teams": teams, "zustand/middleware": middleware }).useTeam;
  const useFavoriteTeams = load("hooks/useFavoriteTeams.ts", { "@/lib/teams": teams, "zustand/middleware": middleware }).useFavoriteTeams;
  assert.equal(useTeam.getState().selectedTeam.id, heat.id);
  assert.equal(useTeam.getState().selectedTeam.logo, heat.logo);
  assert.deepEqual(useFavoriteTeams.getState().favoriteTeamIds, [lakers.id]);
  assert.equal(useFavoriteTeams.getState().favoriteTeamIds.includes(heat.id), false);
});

function preferenceBag(fail) {
  const saved = new Map([
    ["nba-feed-team", JSON.stringify({ version: 0, state: { selectedTeam: { ...heat, logo: "https://cdn.example/legacy.svg" } } })],
    ["nba-feed-favorite-teams", JSON.stringify({ version: 1, state: { favoriteTeamIds: [lakers.id] } })],
  ]);
  let preferenceWrites = 0;
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      if (key === "nba-feed-team" || key === "nba-feed-favorite-teams") preferenceWrites += 1;
      if (fail(preferenceWrites, key)) throw new Error(`quota ${key}`);
      saved.set(key, value);
    },
    removeItem: (key) => saved.delete(key),
  };
  return { saved, storage };
}

function readPair(saved) {
  return {
    focus: JSON.parse(saved.get("nba-feed-team")).state.selectedTeam.abbreviation,
    follows: JSON.parse(saved.get("nba-feed-favorite-teams")).state.favoriteTeamIds,
    focusRaw: saved.get("nba-feed-team"),
  };
}

test("Done writes the focus and the follows together, or restores the previous pair", () => {
  const { persist, createJSONStorage } = require("zustand/middleware");
  const both = preferenceBag(() => false);
  const committed = yourTeams.commitYourTeamsPreferences(both.storage, { focus: knicks, followingIds: [] });
  assert.equal(committed.committed, true);
  assert.deepEqual(readPair(both.saved).follows, []);
  assert.equal(readPair(both.saved).focus, "NYK");
  assert.equal(JSON.parse(both.saved.get("nba-feed-team")).state.favoriteTeamIds, undefined);
  assert.equal(readPair(both.saved).follows.includes(knicks.id), false);

  const second = preferenceBag((count) => count === 2);
  const previousFocus = second.saved.get("nba-feed-team");
  const restored = yourTeams.commitYourTeamsPreferences(second.storage, { focus: knicks, followingIds: [] });
  assert.equal(restored.committed, false);
  assert.equal(restored.restored, true);
  assert.equal(second.saved.get("nba-feed-team"), previousFocus);
  assert.deepEqual(readPair(second.saved).follows, [lakers.id]);

  const torn = preferenceBag((count) => count >= 2);
  const tornResult = yourTeams.commitYourTeamsPreferences(torn.storage, { focus: knicks, followingIds: [] });
  assert.equal(tornResult.committed, false);
  assert.equal(tornResult.restored, false);
  assert.equal(readPair(torn.saved).focus, "NYK");
  assert.deepEqual(readPair(torn.saved).follows, [lakers.id]);

  const first = preferenceBag((count) => count === 1);
  const firstFocus = first.saved.get("nba-feed-team");
  const firstFollows = first.saved.get("nba-feed-favorite-teams");
  const blocked = yourTeams.commitYourTeamsPreferences(first.storage, { focus: knicks, followingIds: [heat.id] });
  assert.equal(blocked.committed, false);
  assert.equal(blocked.restored, true);
  assert.equal(first.saved.get("nba-feed-team"), firstFocus);
  assert.equal(first.saved.get("nba-feed-favorite-teams"), firstFollows);

  const open = (storage) => {
    const middleware = { persist: (config, options) => persist(config, { ...options, storage: createJSONStorage(() => storage) }) };
    return {
      useTeam: load("hooks/useTeam.ts", { "@/lib/teams": teams, "zustand/middleware": middleware }).useTeam,
      useFavoriteTeams: load("hooks/useFavoriteTeams.ts", { "@/lib/teams": teams, "zustand/middleware": middleware }).useFavoriteTeams,
    };
  };
  const kept = open(second.storage);
  assert.equal(kept.useTeam.getState().selectedTeam.abbreviation, "MIA");
  assert.deepEqual(JSON.parse(JSON.stringify(kept.useFavoriteTeams.getState().favoriteTeamIds)), [lakers.id]);
  const partial = open(torn.storage);
  assert.equal(partial.useTeam.getState().selectedTeam.abbreviation, "NYK");
  assert.deepEqual(JSON.parse(JSON.stringify(partial.useFavoriteTeams.getState().favoriteTeamIds)), [lakers.id]);
  const saved = open(both.storage);
  assert.equal(saved.useTeam.getState().selectedTeam.abbreviation, "NYK");
  assert.deepEqual(JSON.parse(JSON.stringify(saved.useFavoriteTeams.getState().favoriteTeamIds)), []);
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
