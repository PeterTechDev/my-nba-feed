"use client";
import { useEffect, useState } from "react";
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
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/standings")
      .then((r) => r.json())
      .then((d) => { setStandings(d.standings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left p-3 pl-4">#</th>
                  <th className="text-left p-3">Team</th>
                  <th className="text-center p-3">W</th>
                  <th className="text-center p-3">L</th>
                  <th className="text-center p-3">PCT</th>
                  <th className="text-center p-3 pr-4">GB</th>
                </tr>
              </thead>
              <tbody>
                {confTeams.map((team, i) => {
                  const pct = team.wins / (team.wins + team.losses || 1);
                  const leaderPct = leaderWins / (leaderWins + leaderLosses || 1);
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
                      <td className="p-3 pl-4 text-white/40 tabular-nums">{i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getLogoUrl(team.abbreviation)} alt="" className="w-5 h-5" />
                          <span className="font-medium">{team.abbreviation}</span>
                          {isPlayoff && <span className="text-[9px] text-emerald-400/60 font-medium">●</span>}
                          {isPlayIn && <span className="text-[9px] text-yellow-400/60 font-medium">●</span>}
                        </div>
                      </td>
                      <td className="text-center p-3 tabular-nums font-medium">{team.wins}</td>
                      <td className="text-center p-3 tabular-nums text-white/60">{team.losses}</td>
                      <td className="text-center p-3 tabular-nums">{pct.toFixed(3).replace("0.", ".")}</td>
                      <td className="text-center p-3 pr-4 tabular-nums text-white/50">{gb === 0 ? "—" : gb.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 flex gap-4 text-[10px] text-white/30 border-t border-white/5">
            <span className="flex items-center gap-1"><span className="text-emerald-400">●</span> Playoff</span>
            <span className="flex items-center gap-1"><span className="text-yellow-400">●</span> Play-In</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Standings</h1>
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      ) : standings.length === 0 ? (
        <p className="text-white/40 text-center py-16">No standings data available</p>
      ) : (
        <>
          {renderConference("East", "Eastern Conference")}
          {renderConference("West", "Western Conference")}
        </>
      )}
    </main>
  );
}
