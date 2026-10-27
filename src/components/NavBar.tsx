"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3, Calendar, Play, ArrowLeftRight, MessageCircle, Eye, EyeOff, Menu, X, Settings, BookOpen, Heart, Info } from "lucide-react";
import Modal from "./Modal";
import FavoriteTeamsModal from "./FavoriteTeamsModal";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useSpoilerContext } from "./SpoilerModeProvider";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/players", label: "Players", icon: Users },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/highlights", label: "Highlights", icon: Play },
  { href: "/compare", label: "Compare", icon: ArrowLeftRight },
  { href: "/social", label: "Social", icon: MessageCircle },
  { href: "/digest", label: "Digest", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
];

export default function NavBar() {
  const pathname = usePathname();
  const { spoilerFree, hideScores, hideHeadlines, toggleSpoiler, setHideScores, setHideHeadlines } = useSpoilerContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [myTeamsOpen, setMyTeamsOpen] = useState(false);
  const { favoriteTeamIds } = useFavoriteTeams();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileProtection = spoilerFree ? "Spoilers hidden" : hideScores ? "Scores hidden" : hideHeadlines ? "Headlines hidden" : "Spoilers shown";
  const protection = `${mobileProtection} by default`;

  const navigationLinks = links.map((link) => {
    const active = pathname === link.href;
    const Icon = link.icon;
    return (
      <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
        <Icon aria-hidden="true" className="h-4 w-4" />{link.label}
      </Link>
    );
  });

  return (
    <>
    <nav aria-label="Main navigation" className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex min-h-16 items-center gap-0 sm:gap-2">
          <Link href="/" className="mr-auto flex min-h-11 shrink-0 items-center text-base font-bold text-white">
            NBA Feed
          </Link>
          <button type="button" onClick={toggleSpoiler}
            aria-label={`${protection}. ${spoilerFree ? "Show scores and headlines by default" : "Hide scores and headlines by default"}`}
            title="Default spoiler protection. Individual items can be revealed."
            aria-pressed={spoilerFree ? true : hideScores || hideHeadlines ? "mixed" : false}
            className={`flex min-h-11 min-w-11 justify-center shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs min-[360px]:text-sm font-medium sm:px-3 ${hideScores || hideHeadlines ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            {hideScores || hideHeadlines ? <EyeOff aria-hidden="true" className="hidden h-4 w-4 min-[360px]:block" /> : <Eye aria-hidden="true" className="hidden h-4 w-4 min-[360px]:block" />}
            <span className="max-w-[4rem] leading-tight sm:hidden">{mobileProtection}</span>
            <span className="hidden sm:inline">{protection}</span>
          </button>
          <button type="button" onClick={() => setMyTeamsOpen(true)} aria-label={`My Teams (${favoriteTeamIds.length} selected)`}
            className={`relative flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-xs min-[360px]:text-sm sm:px-3 ${favoriteTeamIds.length ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            <Heart aria-hidden="true" className="hidden h-4 w-4 min-[360px]:block" />
            <span>My Teams</span>
            {favoriteTeamIds.length > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-900 px-1 text-xs text-emerald-200">{favoriteTeamIds.length}</span>}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Spoiler settings"
            className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-sm text-white/70 hover:bg-white/5 hover:text-white sm:flex sm:px-3">
            <Settings aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Settings</span>
          </button>
          <button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 xl:hidden">
            {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
        <div className="hidden border-t border-white/10 py-1 xl:flex xl:items-center xl:gap-1">{navigationLinks}</div>
        <div id="mobile-navigation" hidden={!menuOpen} className="border-t border-white/10 pb-3 pt-2 xl:hidden"
          onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus(); } }}>
          <div className="grid grid-cols-2 gap-1">{navigationLinks}</div>
          <button type="button" onClick={() => setSettingsOpen(true)}
            className="mt-2 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white sm:hidden">
            <Settings aria-hidden="true" className="h-4 w-4" />Spoiler settings
          </button>
        </div>
      </div>
    </nav>
    {settingsOpen && (
      <Modal title="Spoiler settings" onClose={() => setSettingsOpen(false)}>
          <p className="text-sm text-white/70">Choose what stays hidden by default. Revealing a post, digest or results view shows only that content without changing these defaults.</p>
          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide scores and records</p>
                <p className="text-xs text-white/70 mt-1">Protects game scores, records, standings and comparison statistics until reveal.</p>
              </div>
              <input
                type="checkbox"
                checked={hideScores}
                onChange={(event) => setHideScores(event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide result headlines</p>
                <p className="text-xs text-white/70 mt-1">Protects news headlines and all social titles and images until reveal.</p>
              </div>
              <input
                type="checkbox"
                checked={hideHeadlines}
                onChange={(event) => setHideHeadlines(event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </div>
          <p className="mt-4 text-xs text-white/70">Protection applies inside NBA Feed. External sites and search results may contain spoilers.</p>
      </Modal>
    )}
    {myTeamsOpen && <FavoriteTeamsModal onClose={() => setMyTeamsOpen(false)} />}
    </>
  );
}
