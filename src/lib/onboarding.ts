import type { ProductEvent } from "./productEvents";
import { recordProductEvent } from "./productEvents";
import { getCeltics, teams, type Team } from "./teams";
import { normalizeFollowing } from "./yourTeams";
import { hasSavedTeamPreference } from "../hooks/useTeam";

export const onboardingCopy = {
  heading: "Which team do you follow?",
  subcopy: "We'll keep scores hidden until you ask.",
  skip: "Skip for now",
  skipped: "Following the Celtics for now. Change anytime in Your teams.",
  loadError: "We couldn't load teams. Retry.",
  retry: "Retry",
  continue: "Continue",
} as const;

/** The 30 teams are local. An empty result is the same failure as a thrown read. */
export function loadOnboardingTeams(): Team[] {
  return teams;
}

export function readTeamList(load: () => readonly Team[]): { teams: Team[]; error: boolean } {
  try {
    const list = load();
    if (!Array.isArray(list) || list.length === 0) return { teams: [], error: true };
    return { teams: [...list], error: false };
  } catch {
    return { teams: [], error: true };
  }
}

export function decideOnboardingPhase(getItem: (key: string) => string | null): "choose" | "ready" {
  return hasSavedTeamPreference(getItem) ? "ready" : "choose";
}

export function continueLabel(team: { city: string; name: string }) {
  return `Continue with ${team.city} ${team.name}`;
}

/** Arrow keys move the choice. Enter, Space and Escape do not confirm it. */
export function nextOnboardingTeamId(currentId: number | null, key: string, order: readonly number[]): number | null {
  if (order.length === 0) return null;
  const index = currentId == null ? -1 : order.indexOf(currentId);
  const last = order.length - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return order[index >= last ? 0 : index + 1];
    case "ArrowLeft":
    case "ArrowUp":
      return order[index <= 0 ? last : index - 1];
    case "Home":
      return order[0];
    case "End":
      return order[last];
    default:
      return null;
  }
}

/** Escape dismisses the dialog the same way as Skip for now. */
export function onboardingEscapeAction() {
  return "skip" as const;
}

export function onboardingCommit(
  choice: "continue" | "skip",
  selected: Team | null,
  followingIds: readonly number[],
): { focus: Team; followingIds: number[]; event: ProductEvent; notice: string | null } | null {
  const following = normalizeFollowing(followingIds);
  if (choice === "skip") {
    const focus = getCeltics();
    return {
      focus,
      followingIds: following,
      event: { name: "onboarding_skipped", default_team_id: focus.id },
      notice: onboardingCopy.skipped,
    };
  }
  if (!selected) return null;
  return {
    focus: selected,
    followingIds: following,
    event: { name: "team_selected", team_id: selected.id, source: "onboarding" },
    notice: null,
  };
}

export function completeOnboarding(
  choice: "continue" | "skip",
  selected: Team | null,
  followingIds: readonly number[],
  commit: (focus: Team, followingIds: readonly number[]) => void,
): { ok: true; notice: string | null } | { ok: false; reason: "needs-selection" | "save-failed" } {
  const next = onboardingCommit(choice, selected, followingIds);
  if (!next) return { ok: false, reason: "needs-selection" };
  try {
    commit(next.focus, next.followingIds);
  } catch {
    return { ok: false, reason: "save-failed" };
  }
  recordProductEvent(next.event);
  return { ok: true, notice: next.notice };
}
