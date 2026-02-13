"use client";
import { useTeam } from "@/hooks/useTeam";
import TeamSelector from "./TeamSelector";
import RecordBadge from "./RecordBadge";

export default function TeamHeader() {
  const { selectedTeam: team } = useTeam();

  return (
    <div
      className="relative rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 overflow-hidden text-center sm:text-left"
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
        className="w-20 h-20 sm:w-28 sm:h-28 object-contain relative z-10"
      />
      <div className="flex-1 relative z-10">
        <p className="text-sm text-white/50 font-medium">{team.city}</p>
        <h1 className="text-3xl sm:text-4xl font-bold">{team.name}</h1>
        <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
          <p className="text-sm text-white/40">{team.conference}ern Conference · {team.division}</p>
          <RecordBadge />
        </div>
      </div>
      <div className="relative z-10 w-full sm:w-auto">
        <TeamSelector />
      </div>
    </div>
  );
}
