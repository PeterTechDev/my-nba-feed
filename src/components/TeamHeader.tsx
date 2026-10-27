"use client";
import { useTeam } from "@/hooks/useTeam";
import TeamSelector from "./TeamSelector";
import RecordBadge from "./RecordBadge";

export default function TeamHeader() {
  const { selectedTeam: team } = useTeam();

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-6 grid grid-cols-[4rem_minmax(0,1fr)] sm:flex items-center gap-3 sm:gap-4 overflow-hidden text-left"
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
        className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10"
      />
      <div className="flex-1 relative z-10">
        <h1 className="text-2xl sm:text-3xl font-bold">{team.city} {team.name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-white/70">Focus team · {team.conference}ern Conference</p>
          <RecordBadge />
        </div>
        <p className="mt-2 text-xs text-white/70">Games and briefing follow this team.</p>
      </div>
      <div className="relative z-10 col-span-2 w-full sm:w-auto">
        <TeamSelector />
      </div>
    </div>
  );
}
