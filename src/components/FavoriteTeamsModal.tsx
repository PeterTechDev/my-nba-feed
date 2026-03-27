"use client";
import { teams } from "@/lib/teams";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";

interface FavoriteTeamsModalProps {
  onClose: () => void;
}

export default function FavoriteTeamsModal({ onClose }: FavoriteTeamsModalProps) {
  const { favoriteTeamIds, toggleTeam, clearFavorites } = useFavoriteTeams();

  const east = teams.filter((t) => t.conference === "East");
  const west = teams.filter((t) => t.conference === "West");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold">⚙️ My Teams</h2>
            <p className="text-sm text-white/40 mt-1">
              {favoriteTeamIds.length === 0
                ? "No teams selected — showing the full league feed."
                : `${favoriteTeamIds.length} team${favoriteTeamIds.length > 1 ? "s" : ""} selected — your feed is personalized.`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {favoriteTeamIds.length > 0 && (
              <button
                type="button"
                onClick={clearFavorites}
                className="text-xs text-white/40 hover:text-white/70 transition px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/35 hover:text-white/70 transition px-3 py-1 text-sm"
            >
              Done
            </button>
          </div>
        </div>

        {/* Team grids */}
        {(["East", "West"] as const).map((conf) => (
          <div key={conf} className="mb-6">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              {conf}ern Conference
            </h3>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {(conf === "East" ? east : west).map((team) => {
                const selected = favoriteTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition relative"
                    style={
                      selected
                        ? {
                            backgroundColor: `${team.primaryColor}20`,
                            boxShadow: `0 0 16px ${team.primaryColor}50`,
                            border: `2px solid ${team.primaryColor}`,
                          }
                        : {
                            border: "2px solid transparent",
                            backgroundColor: "transparent",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!selected) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      }
                    }}
                    title={`${team.city} ${team.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-9 h-9 object-contain"
                    />
                    <span
                      className="text-[10px] text-center leading-tight font-medium"
                      style={{ color: selected ? team.primaryColor : "rgba(255,255,255,0.6)" }}
                    >
                      {team.abbreviation}
                    </span>
                    {selected && (
                      <span
                        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: team.primaryColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-2 pt-4 border-t border-white/5">
          <p className="text-xs text-white/30 text-center">
            Selections are saved automatically · No teams selected shows the full league
          </p>
        </div>
      </div>
    </div>
  );
}
