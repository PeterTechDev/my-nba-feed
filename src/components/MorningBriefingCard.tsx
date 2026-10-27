"use client";
import { Sun } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import NewsList, { type NewsState } from "./NewsList";

export default function MorningBriefingCard(props: NewsState) {
  const { selectedTeam } = useTeam();
  return <section className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-4 sm:p-5">
    <div className="flex flex-wrap items-center gap-2 mb-3"><Sun aria-hidden="true" className="h-4 w-4 text-amber-300" /><h2 className="text-base font-semibold">Morning Briefing</h2>
      <span className="ml-auto text-sm text-white/70">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
    </div>
    <p className="mb-3 text-sm text-white/70">Latest story · {selectedTeam.city} {selectedTeam.name}</p>
    <NewsList {...props} subject={`${selectedTeam.name} stories`} />
  </section>;
}
