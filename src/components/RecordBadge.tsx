"use client";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import ScoreReveal from "./ScoreReveal";

export default function RecordBadge() {
  const { record, loading, error } = useGameData();
  const { selectedTeam } = useTeam();

  if (loading || error || (!record.redacted && record.wins === 0 && record.losses === 0)) return null;

  return (
    <ScoreReveal scope={`${selectedTeam.id}:record`} label="record" inline><span className="inline-block px-2 py-1 text-sm font-bold text-white/90 tabular-nums">
      {record.wins}-{record.losses}
    </span></ScoreReveal>
  );
}
