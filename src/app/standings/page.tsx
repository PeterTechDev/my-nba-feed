"use client";
import { useRemoteData } from "@/hooks/useRemoteData";
import DataError from "@/components/DataError";
import SpoilerGuard from "@/components/SpoilerGuard";
import { formatGameDate } from "@/lib/nbaDate";
import { useState } from "react";
import { teams } from "@/lib/teams";

interface Standing {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
}

export default function StandingsPage() {
  const { data, loading, error, retry } = useRemoteData<{ standings: Standing[]; season: number; asOf: string }>("/api/standings");
  const standings = data?.standings || [];
  const [fullNames, setFullNames] = useState(false);

  const getLogoUrl = (abbr: string) => {
    const team = teams.find((t) => t.abbreviation === abbr);
    return team?.logo || "";
  };

  const renderConference = (conf: string, label: string) => {
    const confTeams = standings
      .filter((s) => s.conference === conf)
      .sort((a, b) => {
        const pctA = a.wins / (a.wins + a.losses || 1);
        const pctB = b.wins / (b.wins + b.losses || 1);
        return pctB - pctA;
      });

    if (confTeams.length === 0) return null;
    const leader = confTeams[0];
    const leaderWins = leader.wins;
    const leaderLosses = leader.losses;

    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">{label}</h2>
        <div className="rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
          <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70 border-b border-white/10">
            <span><span className="text-emerald-300 font-medium">P</span> Playoff position</span>
            <span><span className="text-yellow-300 font-medium">PI</span> Play-In position</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/70 text-xs uppercase tracking-wider border-b border-white/5">
                  <th scope="col" className="text-left p-2 sm:p-3 sm:pl-4"><span aria-label="Rank">#</span></th>
                  <th scope="col" className="text-left p-2 sm:p-3">Team</th>
                  <th scope="col" className="text-center p-2 sm:p-3"><abbr title="Wins" className="no-underline">W</abbr></th>
                  <th scope="col" className="text-center p-2 sm:p-3"><abbr title="Losses" className="no-underline">L</abbr></th>
                  <th scope="col" className="text-center p-2 sm:p-3"><abbr title="Winning percentage" className="no-underline">PCT</abbr></th>
                  <th scope="col" className="text-center p-2 sm:p-3 sm:pr-4"><abbr title="Games behind the conference leader" className="no-underline">GB</abbr></th>
                </tr>
              </thead>
              <tbody>
                {confTeams.map((team, i) => {
                  const pct = team.wins / (team.wins + team.losses || 1);
                  const gb = ((leaderWins - leaderLosses) - (team.wins - team.losses)) / 2;
                  const isPlayoff = i < 6;
                  const isPlayIn = i >= 6 && i < 10;

                  return (
                    <tr
                      key={team.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition ${
                        i === 5 ? "border-b-2 border-b-emerald-500/30" : i === 9 ? "border-b-2 border-b-yellow-500/30" : ""
                      }`}
                    >
                      <td className="p-2 sm:p-3 sm:pl-4 text-white/70 tabular-nums">{i + 1}</td>
                      <th scope="row" className="p-2 sm:p-3 text-left font-normal">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getLogoUrl(team.abbreviation)} alt="" className="w-5 h-5" />
                          <span className="font-medium">{!fullNames && <span className="sr-only">{team.name}: </span>}{fullNames ? team.name : team.abbreviation}</span>
                          {isPlayoff && <><span aria-hidden="true" className="text-xs text-emerald-300 font-medium">P</span><span className="sr-only">Playoff position</span></>}
                          {isPlayIn && <><span aria-hidden="true" className="text-xs text-yellow-300 font-medium">PI</span><span className="sr-only">Play-In position</span></>}
                        </div>
                      </th>
                      <td className="text-center p-2 sm:p-3 tabular-nums font-medium">{team.wins}</td>
                      <td className="text-center p-2 sm:p-3 tabular-nums text-white/70">{team.losses}</td>
                      <td className="text-center p-2 sm:p-3 tabular-nums">{pct.toFixed(3).replace("0.", ".")}</td>
                      <td className="text-center p-2 sm:p-3 sm:pr-4 tabular-nums text-white/70">{gb === 0 ? "—" : gb.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Standings</h1>
      {data && <p className="text-sm text-white/70 mb-2">{data.season}–{String(data.season + 1).slice(-2)} season · Completed games through {formatGameDate(data.asOf, { month: "short", day: "numeric" })}</p>}
      <p className="text-sm text-white/70 mb-6">BALLDONTLIE · Data refreshes hourly</p>
      {error ? (
        <DataError subject="standings" retry={retry} />
      ) : loading ? (
        <div role="status" aria-label="Loading standings" className="space-y-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      ) : standings.length === 0 ? (
        <p className="text-white/70 text-center py-16">No standings data available</p>
      ) : (
        <SpoilerGuard label="standings">
          <p className="text-sm text-white/70 mb-2">W: wins · L: losses · PCT: winning percentage · GB: games behind the conference leader.</p>
          <button type="button" aria-pressed={fullNames} onClick={() => setFullNames((value) => !value)} className="min-h-11 mb-4 px-3 rounded-lg border border-white/15 text-sm hover:bg-white/10">{fullNames ? "Show abbreviations" : "Show full team names"}</button>
          {renderConference("East", "Eastern Conference")}
          {renderConference("West", "Western Conference")}
        </SpoilerGuard>
      )}
    </main>
  );
}
