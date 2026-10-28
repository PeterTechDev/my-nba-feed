import { Youtube } from "lucide-react";
import { useRemoteData } from "@/hooks/useRemoteData";
import { getHighlightUrl, type HighlightsResponse } from "@/lib/api";
import { formatNBADate } from "@/lib/nbaDate";

export default function GameRecapLink({ teamId, date, homeTeam, awayTeam }: {
  teamId: number; date: string; homeTeam: string; awayTeam: string;
}) {
  const gameDate = date.slice(0, 10);
  const recent = gameDate >= formatNBADate(new Date(Date.now() - 30 * 86400000)) && gameDate <= formatNBADate();
  const { data } = useRemoteData<HighlightsResponse>(recent ? `/api/highlights?teamId=${teamId}&dates=${gameDate}` : null);
  const video = data?.videos[gameDate];
  const label = `${video ? "Watch" : "Find"} ${awayTeam} at ${homeTeam} recap on YouTube (opens in a new tab)`;
  return (
    <a href={video?.url ?? getHighlightUrl(awayTeam, homeTeam, gameDate)} target="_blank" rel="noopener noreferrer"
      aria-label={label} title={label}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-amber-200 hover:bg-white/10 hover:text-white">
      <Youtube aria-hidden="true" className="h-4 w-4 shrink-0" />Recap
    </a>
  );
}
