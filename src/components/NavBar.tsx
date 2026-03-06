"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3, Calendar, Play, ArrowLeftRight, MessageCircle, Eye, EyeOff } from "lucide-react";
import { useSpoilerContext } from "./SpoilerModeProvider";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/players", label: "Players", icon: Users },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/highlights", label: "Highlights", icon: Play },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/social", label: "Social", icon: MessageCircle },
];

export default function NavBar() {
  const pathname = usePathname();
  const { spoilerFree, hideScores, hideHeadlines, toggleSpoiler, setHideScores, setHideHeadlines } = useSpoilerContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
    <nav className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          <Link href="/" className="text-lg font-bold mr-4 shrink-0" style={{ color: "var(--team-primary)" }}>
            NBA Feed
          </Link>
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition shrink-0 ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={toggleSpoiler}
            className={`ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              spoilerFree
                ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
            title={spoilerFree ? "Spoiler-free mode ON" : "Spoiler-free mode OFF"}
          >
            {spoilerFree ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{spoilerFree ? "Spoiler-free" : "Scores visible"}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            Settings
          </button>
        </div>
      </div>
    </nav>
    {settingsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 mx-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Spoiler settings</h2>
              <p className="text-sm text-white/40 mt-1">Choose whether scores and result-heavy headlines stay hidden.</p>
            </div>
            <button type="button" onClick={() => setSettingsOpen(false)} className="text-white/35 hover:text-white/70 transition">
              Close
            </button>
          </div>
          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide scores</p>
                <p className="text-xs text-white/40 mt-1">Applies to live, last game, schedule, and highlights.</p>
              </div>
              <input
                type="checkbox"
                checked={hideScores}
                onChange={(event) => setHideScores(event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide result headlines</p>
                <p className="text-xs text-white/40 mt-1">Masks recap and outcome-heavy news headlines until reveal.</p>
              </div>
              <input
                type="checkbox"
                checked={hideHeadlines}
                onChange={(event) => setHideHeadlines(event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
