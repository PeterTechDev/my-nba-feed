"use client";
import { useTeam } from "@/hooks/useTeam";
import TeamSelector from "./TeamSelector";
import RecordBadge from "./RecordBadge";
import { getContrastColor } from "@/lib/teams";

export default function TeamHeader() {
  const { selectedTeam: team } = useTeam();

  return (
    <div
      className="rounded-2xl p-4 sm:px-6 sm:py-5 grid grid-cols-[4rem_minmax(0,1fr)] sm:flex items-center gap-4 text-left"
      style={{
        background: team.primaryColor,
        color: getContrastColor(team.primaryColor),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.logo}
        alt=""
        width={112}
        height={112}
        loading="eager"
        className="w-16 h-16 sm:w-24 sm:h-24 object-contain shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight [text-wrap:balance]">{team.city} {team.name}</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <p className="text-sm">{team.conference}ern Conference</p>
          <div className="rounded-lg bg-[#101010] px-3 py-1 text-white empty:hidden"><RecordBadge /></div>
        </div>
      </div>
      <div className="col-span-2 w-full rounded-lg bg-[#101010] text-white sm:w-auto">
        <TeamSelector />
      </div>
    </div>
  );
}
