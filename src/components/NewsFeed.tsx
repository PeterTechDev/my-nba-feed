"use client";
import { useTeam } from "@/hooks/useTeam";
import NewsList, { type NewsState } from "./NewsList";

export default function NewsFeed(props: NewsState) {
  const { selectedTeam } = useTeam();
  return <section className="rounded-xl bg-[#161616] border border-[#2a2a2a] p-5">
    <h2 className="text-base font-semibold">More news</h2><p className="mt-1 mb-4 text-sm text-white/70">Newest first</p>
    <NewsList {...props} subject={`${selectedTeam.name} stories`} />
  </section>;
}
