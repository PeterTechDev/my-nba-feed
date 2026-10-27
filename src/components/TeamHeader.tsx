"use client";
import { useTeam } from "@/hooks/useTeam";
import TeamSelector from "./TeamSelector";
import RecordBadge from "./RecordBadge";

export default function TeamHeader() {
  const { selectedTeam: team } = useTeam();

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-8 grid grid-cols-[4rem_minmax(0,1fr)] sm:flex items-center gap-3 sm:gap-6 overflow-hidden text-left"
      style={{
        background: `linear-gradient(135deg, ${team.primaryColor}40, ${team.secondaryColor}20, #0a0a0a)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.logo}
        alt={team.name}
        width={112}
        height={112}
        loading="eager"
        className="w-16 h-16 sm:w-28 sm:h-28 object-contain relative z-10"
      />
      <div className="flex-1 relative z-10">
        <p className="text-sm text-white/70 font-medium">{team.city}</p>
        <h1 className="text-2xl sm:text-4xl font-bold">{team.name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-white/70">{team.conference}ern Conference · {team.division}</p>
          <RecordBadge />
        </div>
      </div>
      <div className="relative z-10 col-span-2 w-full sm:w-auto">
        <TeamSelector />
      </div>
    </div>
  );
}
