"use client";
import { useState, useEffect } from "react";
import { teams, Team } from "@/lib/teams";

interface TeamStats {
  wins: number;
  losses: number;
  ppg: string;
  oppg: string;
  gamesPlayed: number;
}

interface CompareData {
  team1: TeamStats;
  team2: TeamStats;
  headToHead: { team1Wins: number; team2Wins: number };
}

function StatBar({ label, val1, val2, higher1Better }: { label: string; val1: number; val2: number; higher1Better?: boolean }) {
  const max = Math.max(val1, val2, 1);
  const pct1 = (val1 / max) * 100;
  const pct2 = (val2 / max) * 100;
  const best1 = higher1Better !== false ? val1 >= val2 : val1 <= val2;
  const best2 = !best1;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-white/40 mb-1">
        <span className={best1 ? "text-emerald-400 font-medium" : ""}>{val1}</span>
        <span className="uppercase tracking-wider">{label}</span>
        <span className={best2 ? "text-emerald-400 font-medium" : ""}>{val2}</span>
      </div>
      <div className="flex gap-1 h-3">
        <div className="flex-1 flex justify-end">
          <div
            className="h-full rounded-l transition-all"
            style={{ width: `${pct1}%`, background: best1 ? "var(--team-primary)" : "#333" }}
          />
        </div>
        <div className="flex-1">
          <div
            className="h-full rounded-r transition-all"
            style={{ width: `${pct2}%`, background: best2 ? "var(--team-primary)" : "#333" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [team1, setTeam1] = useState<Team>(teams[0]);
  const [team2, setTeam2] = useState<Team>(teams[1]);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team1.id === team2.id) return;
    setLoading(true);
    fetch(`/api/compare?team1=${team1.id}&team2=${team2.id}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [team1.id, team2.id]);

  const TeamSelect = ({ value, onChange, label }: { value: Team; onChange: (t: Team) => void; label: string }) => (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
      <select
        value={value.id}
        onChange={(e) => {
          const t = teams.find((t) => t.id === parseInt(e.target.value));
          if (t) onChange(t);
        }}
        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.city} {t.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Team Comparison</h1>
      <p className="text-sm text-white/40 mb-6">Head-to-head season stats</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <TeamSelect value={team1} onChange={setTeam1} label="Team 1" />
        <TeamSelect value={team2} onChange={setTeam2} label="Team 2" />
      </div>

      {team1.id === team2.id ? (
        <p className="text-white/40 text-center py-8">Select two different teams to compare</p>
      ) : loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      ) : data ? (
        <div className="rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
          <div className="p-6">
            {/* Team headers */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={team1.logo} alt="" className="w-12 h-12" />
                <div>
                  <p className="font-bold">{team1.abbreviation}</p>
                  <p className="text-sm text-white/50">{data.team1.wins}-{data.team1.losses}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/30 uppercase tracking-wider">H2H</p>
                <p className="text-lg font-bold tabular-nums">{data.headToHead.team1Wins} - {data.headToHead.team2Wins}</p>
              </div>
              <div className="flex items-center gap-3 flex-row-reverse">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={team2.logo} alt="" className="w-12 h-12" />
                <div className="text-right">
                  <p className="font-bold">{team2.abbreviation}</p>
                  <p className="text-sm text-white/50">{data.team2.wins}-{data.team2.losses}</p>
                </div>
              </div>
            </div>

            {/* Stats bars */}
            <StatBar label="Wins" val1={data.team1.wins} val2={data.team2.wins} />
            <StatBar label="PPG" val1={parseFloat(data.team1.ppg)} val2={parseFloat(data.team2.ppg)} />
            <StatBar label="OPP PPG" val1={parseFloat(data.team1.oppg)} val2={parseFloat(data.team2.oppg)} higher1Better={false} />
            <StatBar
              label="WIN %"
              val1={data.team1.wins / (data.team1.wins + data.team1.losses || 1)}
              val2={data.team2.wins / (data.team2.wins + data.team2.losses || 1)}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
