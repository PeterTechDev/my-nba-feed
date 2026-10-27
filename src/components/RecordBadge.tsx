"use client";
import { useGameData } from "@/hooks/useGameData";
import { useSpoilerContext } from "./SpoilerModeProvider";

export default function RecordBadge() {
  const { record, loading, error } = useGameData();
  const { hideScores } = useSpoilerContext();

  if (hideScores || loading || error || (record.wins === 0 && record.losses === 0)) return null;

  return (
    <span className="text-sm font-bold text-white/70 tabular-nums">
      {record.wins}-{record.losses}
    </span>
  );
}
