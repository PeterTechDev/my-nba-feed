"use client";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import TeamSelector from "@/components/TeamSelector";
import { ChevronDown } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: string;
  height: string;
  weight: string;
  college: string;
  country: string;
  draftYear: number;
  draftRound: number;
  draftNumber: number;
}

export default function PlayersPage() {
  const { selectedTeam } = useTeam();
  const { data, loading, error, retry } = useRemoteData<{ players: Player[]; source?: string }>(`/api/players?teamId=${selectedTeam.id}`);
  const players = data?.players || [];

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedTeam.logo} alt="" className="w-10 h-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{selectedTeam.name} Roster</h1>
            <p className="text-sm text-white/70">Current roster{data?.source ? ` · ${data.source}` : ""}</p>
          </div>
        </div>
        <TeamSelector />
      </div>

      {error ? (
        <DataError subject="players" retry={retry} />
      ) : loading ? (
        <div role="status" aria-label="Loading roster" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5 animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded mb-2" />
              <div className="h-4 w-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <p className="text-white/70 text-center py-16">No players found for this team</p>
      ) : (
        <div className="divide-y divide-white/10 sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {players.map((p) => (
            <article key={p.id} className="py-2 sm:p-5 sm:rounded-xl sm:bg-[#161616] sm:border sm:border-[#2a2a2a]">
              <details className="group sm:hidden">
                <summary className="min-h-11 cursor-pointer list-none flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0"><span className="block text-base font-semibold">{p.firstName} {p.lastName}</span><span className="text-sm text-white/70">{p.position || "Position unavailable"}{p.jerseyNumber ? ` · #${p.jerseyNumber}` : ""}</span></span>
                  <span className="flex items-center gap-2 shrink-0 text-sm text-white/70"><span>Details</span><ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" /></span>
                </summary>
                <PlayerDetails player={p} />
              </details>
              <div className="hidden sm:block">
                <h2 className="text-lg font-bold">{p.firstName} {p.lastName}</h2>
                <p className="text-sm text-white/70">{p.position || "Position unavailable"}{p.jerseyNumber ? ` · #${p.jerseyNumber}` : ""}</p>
                <PlayerDetails player={p} />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function PlayerDetails({ player: p }: { player: Player }) {
  return <div className="mt-3 mb-2 grid grid-cols-2 gap-2 text-sm text-white/70">
    {p.height && <div>Height: {p.height}</div>}
    {p.weight && <div>Weight: {p.weight} lbs</div>}
    {p.college && <div className="col-span-2">College: {p.college}</div>}
    {p.country && p.country !== "USA" && <div>Country: {p.country}</div>}
    {Boolean(p.draftYear) && <div className="col-span-2">Draft: {p.draftYear} R{p.draftRound} #{p.draftNumber}</div>}
  </div>;
}
