"use client";
import { teams, Team } from "@/lib/teams";
import { useTeam } from "@/hooks/useTeam";
import { useState } from "react";

export default function TeamSelector() {
  const { selectedTeam, setTeam } = useTeam();
  const [open, setOpen] = useState(false);

  const east = teams.filter((t) => t.conference === "East");
  const west = teams.filter((t) => t.conference === "West");

  const handleSelect = (team: Team) => {
    setTeam(team);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium w-full sm:w-auto"
      >
        Change Team
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Select Your Team</h2>
            {(["East", "West"] as const).map((conf) => (
              <div key={conf} className="mb-6">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                  {conf}ern Conference
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                  {(conf === "East" ? east : west).map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleSelect(team)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/10 transition"
                      style={
                        selectedTeam.id === team.id
                          ? { boxShadow: `0 0 20px ${team.primaryColor}60`, border: `2px solid ${team.primaryColor}` }
                          : { border: "2px solid transparent" }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                      <span className="text-[10px] text-white/70 text-center leading-tight">{team.abbreviation}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
