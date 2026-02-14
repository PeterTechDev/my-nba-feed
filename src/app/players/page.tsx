"use client";
import { useEffect, useState } from "react";
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/players?teamId=${selectedTeam.id}`)
      .then((r) => r.json())
      .then((d) => { setPlayers(d.players || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedTeam.id]);

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedTeam.logo} alt="" className="w-10 h-10" />
        <div>
          <h1 className="text-2xl font-bold">{selectedTeam.name} Roster</h1>
          <p className="text-sm text-white/40">Current season players</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5 animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded mb-2" />
              <div className="h-4 w-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <p className="text-white/40 text-center py-16">No players found for this team</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <div key={p.id} className="rounded-xl bg-[#161616] border border-[#2a2a2a] overflow-hidden">
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, var(--team-primary), transparent)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">{p.firstName} {p.lastName}</p>
                    <p className="text-sm text-white/50">{p.position || "N/A"}</p>
                  </div>
                  {p.jerseyNumber && (
                    <span className="text-2xl font-extrabold text-white/10">#{p.jerseyNumber}</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/40">
                  {p.height && <div><span className="text-white/60">Height:</span> {p.height}</div>}
                  {p.weight && <div><span className="text-white/60">Weight:</span> {p.weight} lbs</div>}
                  {p.college && <div className="col-span-2"><span className="text-white/60">College:</span> {p.college}</div>}
                  {p.country && p.country !== "USA" && <div><span className="text-white/60">Country:</span> {p.country}</div>}
                  {p.draftYear && <div><span className="text-white/60">Draft:</span> {p.draftYear} R{p.draftRound} #{p.draftNumber}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
