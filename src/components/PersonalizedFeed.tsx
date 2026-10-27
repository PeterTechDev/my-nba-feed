"use client";
import { formatGameDate, gameDaysAgo } from "@/lib/nbaDate";
import { useRemoteData } from "@/hooks/useRemoteData";
import { useFavoriteTeamObjects } from "@/hooks/useFavoriteTeams";
import { getContrastColor, type Team } from "@/lib/teams";
import { getOpponent, getOpponentScore, getTeamScore, type GamesResponse, type NewsFeeds } from "@/lib/api";
import DataError from "./DataError";
import NewsList, { NewsLinkWarning, type NewsState } from "./NewsList";
import ScoreReveal from "./ScoreReveal";

function TeamNewsSection({ team, ...newsState }: NewsState & { team: Team }) {
  const { data: gameData, error: gameError, retry: retryGame } = useRemoteData<GamesResponse>(`/api/games?teamId=${team.id}`, 30000);
  const lastGame = gameData?.lastGame;
  const lastNight = lastGame && gameDaysAgo(lastGame.date) === 1 ? lastGame : null;
  return <section aria-label={`${team.city} ${team.name} news`} className="self-start rounded-xl overflow-hidden border border-white/10 bg-[#111111]">
    <div className="px-4 py-4 flex items-center gap-3" style={{ background: team.primaryColor, color: getContrastColor(team.primaryColor) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={team.logo} alt="" width={40} height={40} className="w-10 h-10 object-contain shrink-0" />
      <h3 className="text-lg font-semibold">{team.city} {team.name}</h3>
    </div>
    <div className="p-4 space-y-3">
      <NewsList {...newsState} subject={`${team.name} stories`} showWarning={false} />
      {gameError && <DataError subject={`${team.name} games`} retry={retryGame} />}
      {lastNight && <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-sm text-white/70">Last night · {formatGameDate(lastNight.date, { month: "short", day: "numeric" })}</p>
        <ScoreReveal scope={`${team.id}:${lastNight.id}`} label={`${team.name} result`}>
          <p className="text-lg font-bold tabular-nums">{team.abbreviation} {getTeamScore(lastNight)} – {getOpponentScore(lastNight)} {getOpponent(lastNight).abbreviation}</p>
          <p className={`text-sm ${getTeamScore(lastNight) > getOpponentScore(lastNight) ? "text-emerald-400" : "text-red-400"}`}>{getTeamScore(lastNight) > getOpponentScore(lastNight) ? "Win" : "Loss"}</p>
        </ScoreReveal>
      </div>}
    </div>
  </section>;
}

export function LeagueNewsSection(props: NewsState) {
  return <section aria-labelledby="league-news-heading" className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5">
    <h2 id="league-news-heading" className="text-base font-semibold">Around the League</h2>
    <p className="mt-1 mb-4 text-sm text-white/70">Newest first · Articles already shown above are excluded</p>
    <NewsList {...props} subject="league stories" />
  </section>;
}

export default function PersonalizedFeed({ feeds, loading, error, retry }: { feeds: NewsFeeds; loading: boolean; error: boolean; retry: () => void }) {
  const favoriteTeams = useFavoriteTeamObjects();
  if (!favoriteTeams.length) return null;
  return <section aria-labelledby="my-teams-heading">
    <div className="flex items-center gap-3 mb-3 sm:mb-4"><h2 id="my-teams-heading" className="text-xl font-bold tracking-tight">Your teams, latest news</h2><span className="text-sm text-white/70">{favoriteTeams.length}</span></div>
    <NewsLinkWarning />
    <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">{favoriteTeams.map((team) => <TeamNewsSection key={team.id} team={team}
      news={feeds[team.name]?.items ?? []} loading={loading} error={error || Boolean(feeds[team.name]?.error)} retry={retry} />)}</div>
  </section>;
}
