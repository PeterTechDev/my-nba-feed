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
  vm.runInNewContext(code, {
    ...globals,
    exports,
    require: (id) => imports[id] ?? require(id),
  });
  return exports;
}

const teams = load("lib/teams.ts");
const events = load("lib/productEvents.ts");
const yourTeams = load("lib/yourTeams.ts", { "./teams": teams, "./productEvents": events });
const useTeamModule = load("hooks/useTeam.ts", {
  "@/lib/teams": teams,
  "@/lib/yourTeams": yourTeams,
  "zustand/middleware": require("zustand/middleware"),
});
const onboarding = load("lib/onboarding.ts", {
  "./teams": teams,
  "./productEvents": events,
  "./yourTeams": yourTeams,
  "../hooks/useTeam": useTeamModule,
});

const json = (value) => JSON.parse(JSON.stringify(value));
const celtics = teams.getCeltics();
const lakers = teams.teams.find((team) => team.abbreviation === "LAL");
const heat = teams.teams.find((team) => team.abbreviation === "MIA");
const knicks = teams.teams.find((team) => team.abbreviation === "NYK");

function openPreferences(saved, { failCommit = false } = {}) {
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      if (failCommit && key === "nba-feed-your-teams") throw new Error("quota");
      saved.set(key, value);
    },
    removeItem: (key) => saved.delete(key),
  };
  const loaded = load("hooks/useTeam.ts", {
    "@/lib/teams": teams,
    "@/lib/yourTeams": yourTeams,
    "zustand/middleware": require("zustand/middleware"),
  }, { window: { localStorage: storage } });
  return loaded.useTeam;
}

function screen(props) {
  return createElement(OnboardingScreen, {
    teams: teams.teams,
    loadError: false,
    selectedId: null,
    saveError: false,
    onSelect() {},
    onContinue() {},
    onSkip() {},
    onRetry() {},
    ...props,
  });
}

function collect(node, found = []) {
  if (node == null || typeof node !== "object") return found;
  if (node.props) found.push(node);
  const kids = node.props?.children;
  const list = kids == null ? [] : typeof kids.length === "number" && !kids.props ? Array.from(kids) : [kids];
  for (const kid of list) collect(kid, found);
  return found;
}

const { OnboardingScreen } = load("components/OnboardingScreen.tsx", {
  "@/lib/onboarding": onboarding,
  "@/lib/teams": teams,
  "@/lib/yourTeams": yourTeams,
});
const { OnboardingFrame, OnboardingGate } = load("components/OnboardingGate.tsx", {
  react: require("react"),
  "@/lib/onboarding": onboarding,
  "@/lib/teams": teams,
  "@/lib/yourTeams": yourTeams,
  "@/hooks/useTeam": useTeamModule,
  "./OnboardingScreen": { OnboardingScreen },
});

test("a first visit has no saved preference, including when storage is denied", () => {
  assert.equal(useTeamModule.hasSavedTeamPreference(() => null), false);
  assert.equal(useTeamModule.hasSavedTeamPreference(() => { throw new Error("SecurityError"); }), false);
  assert.equal(onboarding.decideOnboardingPhase(() => null), "choose");
});

test("a canonical record or either legacy key counts as a saved preference", () => {
  const canonical = JSON.stringify({ version: 1, state: { selectedTeam: heat, favoriteTeamIds: [lakers.id] } });
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => key === "nba-feed-your-teams" ? canonical : null), true);
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => key === "nba-feed-team" ? "{}" : null), true);
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => key === "nba-feed-favorite-teams" ? "[]" : null), true);
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => key === "nba-feed-your-teams" ? "{not json" : key === "nba-feed-team" ? "{}" : null), true);
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => key === "nba-feed-your-teams" ? "{not json" : null), false);
  assert.equal(onboarding.decideOnboardingPhase((key) => key === "nba-feed-team" ? "{}" : null), "ready");
});

test("continue saves only the focus and skip always saves the Celtics", () => {
  const continued = onboarding.onboardingCommit("continue", lakers, [heat.id]);
  assert.equal(continued.focus, lakers);
  assert.deepEqual(json(continued.followingIds), [heat.id]);
  assert.equal(continued.followingIds.includes(lakers.id), false);
  assert.deepEqual(json(continued.event), { name: "team_selected", team_id: lakers.id, source: "onboarding" });
  assert.equal(continued.notice, null);

  const skipped = onboarding.onboardingCommit("skip", lakers, [heat.id]);
  assert.equal(skipped.focus, celtics);
  assert.deepEqual(json(skipped.followingIds), [heat.id]);
  assert.deepEqual(json(skipped.event), { name: "onboarding_skipped", default_team_id: celtics.id });
  assert.equal(skipped.notice, "Following the Celtics for now. Change anytime in Your teams.");
  assert.equal(onboarding.onboardingCommit("continue", null, []), null);
  assert.equal(onboarding.onboardingEscapeAction(), "skip");
});

test("a failed commit does not emit a success event or replace the saved pair", () => {
  const seen = [];
  const unsubscribe = events.subscribeProductEvents((event) => seen.push(event));
  const saved = new Map();
  const store = openPreferences(saved, { failCommit: true });
  const failed = onboarding.completeOnboarding("continue", knicks, store.getState().favoriteTeamIds, store.getState().commit);
  assert.deepEqual(json(failed), { ok: false, reason: "save-failed" });
  assert.equal(seen.length, 0);
  assert.equal(store.getState().selectedTeam.abbreviation, "BOS");
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState().favoriteTeamIds)), []);
  assert.equal(saved.has("nba-feed-your-teams"), false);
  unsubscribe();
});

test("continue persists the focus through the Your teams record and leaves following untouched", () => {
  const seen = [];
  const unsubscribe = events.subscribeProductEvents((event) => seen.push(event));
  const saved = new Map();
  const store = openPreferences(saved);
  store.getState().commit(celtics, [heat.id]);
  saved.delete("nba-feed-your-teams");
  const result = onboarding.completeOnboarding("continue", lakers, store.getState().favoriteTeamIds, store.getState().commit);
  assert.deepEqual(json(result), { ok: true, notice: null });
  assert.equal(store.getState().selectedTeam.abbreviation, "LAL");
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState().favoriteTeamIds)), [heat.id]);
  assert.equal(store.getState().favoriteTeamIds.includes(lakers.id), false);
  assert.deepEqual(json(seen), [{ name: "team_selected", team_id: lakers.id, source: "onboarding" }]);
  const record = JSON.parse(saved.get("nba-feed-your-teams"));
  assert.equal(record.state.selectedTeam.abbreviation, "LAL");
  assert.deepEqual(record.state.favoriteTeamIds, [heat.id]);
  assert.equal(saved.has("nba-feed-team"), false);
  const reloaded = openPreferences(saved);
  assert.equal(reloaded.getState().selectedTeam.abbreviation, "LAL");
  assert.equal(useTeamModule.hasSavedTeamPreference((key) => saved.get(key) ?? null), true);
  unsubscribe();
});

test("skip persists the Celtics and a reload does not need onboarding again", () => {
  const seen = [];
  const unsubscribe = events.subscribeProductEvents((event) => seen.push(event));
  const saved = new Map();
  const store = openPreferences(saved);
  const result = onboarding.completeOnboarding("skip", lakers, [], store.getState().commit);
  assert.equal(result.ok, true);
  assert.equal(result.notice, "Following the Celtics for now. Change anytime in Your teams.");
  assert.equal(store.getState().selectedTeam.abbreviation, "BOS");
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState().favoriteTeamIds)), []);
  assert.deepEqual(json(seen), [{ name: "onboarding_skipped", default_team_id: celtics.id }]);
  assert.equal(onboarding.decideOnboardingPhase((key) => saved.get(key) ?? null), "ready");
  unsubscribe();
});

test("an empty or failed team list is retryable and is not the feed", () => {
  assert.equal(onboarding.readTeamList(() => teams.teams).error, false);
  assert.equal(onboarding.readTeamList(() => teams.teams).teams.length, 30);
  assert.deepEqual(json(onboarding.readTeamList(() => { throw new Error("offline"); })), { teams: [], error: true });
  assert.deepEqual(json(onboarding.readTeamList(() => [])), { teams: [], error: true });
  const source = readFileSync(new URL("../src/lib/onboarding.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch|gtag|posthog|plausible|beacon|localStorage/i);
});

test("the picker shows the promise, waits for a choice, and keeps a 48px logo box", () => {
  const html = renderToStaticMarkup(screen());
  assert.match(html, /Which team do you follow\?/);
  assert.match(html, /We(?:'|&#x27;)ll keep scores hidden until you ask\./);
  assert.match(html, /Skip for now/);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-labelledby="onboarding-heading"/);
  assert.equal((html.match(/role="radio"/g) ?? []).length, 30);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Boston Celtics"[^>]*tabindex="0"|tabindex="0"[^>]*aria-label="Boston Celtics"/);
  assert.match(html, /id="onboarding-continue"[^>]*disabled=""/);
  assert.match(html, />Continue</);
  assert.doesNotMatch(html, /Continue with /);
  assert.equal((html.match(/width:48px;height:48px/g) ?? []).length, 30);
  assert.equal((html.match(/<img[^>]*alt=""/g) ?? []).length, 30);
  assert.match(html, /min-h-11/);
  assert.match(html, /min-w-11/);
  assert.doesNotMatch(html, /Games|Latest news|Your teams, latest news/);

  const selected = renderToStaticMarkup(screen({ selectedId: lakers.id }));
  assert.match(selected, /Continue with Los Angeles Lakers/);
  assert.doesNotMatch(selected, /id="onboarding-continue"[^>]*disabled=""/);
  assert.match(selected, /aria-checked="true"/);

  let picked = null;
  let continued = 0;
  const tree = OnboardingScreen({
    teams: teams.teams,
    loadError: false,
    selectedId: null,
    saveError: false,
    onSelect(id) { picked = id; },
    onContinue() { continued += 1; },
    onSkip() {},
    onRetry() {},
  });
  const radio = collect(tree).find((node) => node.props.role === "radio" && node.props["aria-label"] === "Los Angeles Lakers");
  radio.props.onClick();
  assert.equal(picked, lakers.id);
  assert.equal(continued, 0);
  assert.equal(radio.props.type, "button");
});

test("a failed team list offers retry and skip without a team grid", () => {
  const html = renderToStaticMarkup(screen({ teams: [], loadError: true }));
  assert.match(html, /We couldn(?:'|&#x27;)t load teams\. Retry\./);
  assert.match(html, />Retry</);
  assert.match(html, /Skip for now/);
  assert.doesNotMatch(html, /role="radio"/);
  assert.doesNotMatch(html, /id="onboarding-continue"/);
});

test("a failed save stays on the picker with the Your teams error", () => {
  const html = renderToStaticMarkup(screen({ selectedId: heat.id, saveError: true }));
  assert.match(html, /role="alert"/);
  assert.match(html, /Couldn(?:'|&#x27;)t save your teams\. Try again\./);
  assert.match(html, /Continue with Miami Heat/);
  assert.doesNotMatch(html, /id="onboarding-continue"[^>]*disabled=""/);
  assert.match(html, /Skip for now/);
});

test("keyboard movement changes the selection and Escape is skip", () => {
  const order = teams.teams.map((team) => team.id);
  assert.equal(onboarding.nextOnboardingTeamId(null, "ArrowRight", order), order[0]);
  assert.equal(onboarding.nextOnboardingTeamId(order[0], "ArrowLeft", order), order[order.length - 1]);
  assert.equal(onboarding.nextOnboardingTeamId(order[2], "Enter", order), null);
  assert.equal(onboarding.nextOnboardingTeamId(order[2], "Escape", order), null);
  assert.equal(onboarding.nextOnboardingTeamId(order[2], " ", order), null);
});

test("checking and choosing render no feed, and skip announces the Celtics default", () => {
  const checking = renderToStaticMarkup(createElement(OnboardingGate, null, "Games feed"));
  assert.match(checking, /aria-busy="true"/);
  assert.doesNotMatch(checking, /Games feed|Which team do you follow/);

  const choosing = renderToStaticMarkup(createElement(OnboardingFrame, { phase: "choose", notice: null }, "Games feed"));
  assert.match(choosing, /Which team do you follow\?/);
  assert.doesNotMatch(choosing, /Games feed/);

  const ready = renderToStaticMarkup(createElement(OnboardingFrame, {
    phase: "ready",
    notice: "Following the Celtics for now. Change anytime in Your teams.",
  }, "Games feed"));
  assert.match(ready, /role="status"/);
  assert.match(ready, /Following the Celtics for now\. Change anytime in Your teams\./);
  assert.match(ready, /Games feed/);
  assert.doesNotMatch(ready, /Which team do you follow/);
});

test("Escape skips without saving the highlighted team, and a failed skip stays open", () => {
  const state = [];
  let finished = null;
  const commits = [];
  const seen = [];
  const unsubscribe = events.subscribeProductEvents((event) => seen.push(event));
  const react = {
    useState(initial) {
      const index = state.length;
      const value = typeof initial === "function" ? initial() : initial;
      state.push(value);
      return [state[index], (next) => {
        state[index] = typeof next === "function" ? next(state[index]) : next;
      }];
    },
    useRef: (initial) => ({ current: initial }),
    useEffect() {},
  };
  const store = {
    getState: () => ({
      favoriteTeamIds: [heat.id],
      commit(focus, following) {
        commits.push([focus.abbreviation, [...following]]);
        throw new Error("quota");
      },
    }),
  };
  const { default: Dialog } = load("components/OnboardingGate.tsx", {
    react,
    "@/lib/onboarding": onboarding,
    "@/lib/teams": teams,
    "@/lib/yourTeams": yourTeams,
    "@/hooks/useTeam": { useTeam: store },
    "./OnboardingScreen": { OnboardingScreen },
  });
  const dialog = Dialog({ onFinished(notice) { finished = notice; } });
  let prevented = false;
  dialog.props.onCancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(finished, null);
  assert.deepEqual(commits, [["BOS", [heat.id]]]);
  assert.equal(seen.length, 0);
  assert.equal(state[1], true);
  unsubscribe();
});
