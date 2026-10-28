"use client";
import { teams, Team, getChartColor } from "@/lib/teams";
import { Check } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import Modal from "./Modal";
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
        className="min-h-11 shrink-0 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium w-full sm:w-auto"
      >
        Change focus team
      </button>

      {open && (
        <Modal title="Choose your focus team" onClose={() => setOpen(false)} wide>
            <p className="mb-5 text-sm text-white/70">Sets your roster, games, highlights and briefing. Use My Teams to follow other teams for news.</p>
            {(["East", "West"] as const).map((conf) => (
              <div key={conf} className="mb-6">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  {conf}ern Conference
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  {(conf === "East" ? east : west).map((team) => (
                    <button
                      key={team.id}
                      aria-label={`${team.city} ${team.name}`}
                      aria-pressed={selectedTeam.id === team.id}
                      onClick={() => handleSelect(team)}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/10 transition"
                      style={
                        selectedTeam.id === team.id
                          ? { border: `2px solid ${getChartColor(team.primaryColor)}`, backgroundColor: `${team.primaryColor}20` }
                          : { border: "2px solid transparent" }
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
                      <span className="text-xs text-white/80 text-center leading-tight">{team.name}</span>
                      {selectedTeam.id === team.id && <Check aria-hidden="true" className="absolute right-1 top-1 h-4 w-4 text-amber-300" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </Modal>
      )}
    </>
  );
}
