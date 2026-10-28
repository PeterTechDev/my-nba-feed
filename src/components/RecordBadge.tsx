"use client";
import { useGameData } from "@/hooks/useGameData";
import { useTeam } from "@/hooks/useTeam";
import ScoreReveal from "./ScoreReveal";

const coveredRecord = new Set<string>();

export default function RecordBadge() {
  const { record, loading, error } = useGameData();
  const { selectedTeam } = useTeam();
  const teamId = String(selectedTeam.id);
  if (record.redacted) coveredRecord.add(teamId);
  const covered = coveredRecord.has(teamId);

  if (loading || error || (!covered && record.wins === 0 && record.losses === 0)) return null;

  const score = <span className="inline-block px-2 py-1 text-sm font-bold text-white/90 tabular-nums">{record.wins}-{record.losses}</span>;
  const hiddenLabel = <span className="inline-block px-2 py-1 text-sm font-medium text-white/90">Record hidden</span>;
  return (
    <ScoreReveal scope={`${teamId}:record`} label="record" inline placeholder={covered ? hiddenLabel : undefined}>
      {record.redacted ? hiddenLabel : score}
    </ScoreReveal>
  );
}
