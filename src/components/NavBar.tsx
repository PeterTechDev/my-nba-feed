"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, Play, Eye, EyeOff, Menu, X, Settings, BookOpen, Heart, Info } from "lucide-react";
import Modal from "./Modal";
import FavoriteTeamsModal from "./FavoriteTeamsModal";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useSpoilerContext } from "./SpoilerModeProvider";

const links = [
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/highlights", label: "Highlights", icon: Play },
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
        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition xl:px-1.5 ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
        <Icon aria-hidden="true" className="h-4 w-4 xl:hidden" />{link.label}
      </Link>
    );
  });

  return (
    <>
    <nav aria-label="Main navigation" className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex min-h-16 items-center gap-1 sm:gap-2">
          <Link href="/" aria-label="My NBA Feed home" aria-current={pathname === "/" ? "page" : undefined} onClick={() => setMenuOpen(false)} className="relative mr-auto block h-11 w-28 shrink-0 overflow-hidden xl:mr-0">
            <Image src="/branding/my-nba-feed-logo-stacked-dark.png" alt="My NBA Feed" fill sizes="192px" preload className="scale-[1.65] object-cover" />
          </Link>
          <div className="hidden xl:flex xl:items-center">{navigationLinks}</div>
          <div className="flex items-center gap-1 xl:ml-auto xl:border-l xl:border-white/10 xl:pl-3">
          <button type="button" onClick={toggleSpoiler}
            aria-label={`${protection}. ${spoilerFree ? "Show scores and headlines by default" : "Hide scores and headlines by default"}`}
            title={`${protection}. Individual items can be revealed.`}
            aria-pressed={spoilerFree ? true : hideScores || hideHeadlines ? "mixed" : false}
            className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium ${hideScores || hideHeadlines ? "text-amber-300 hover:bg-amber-500/10" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            {hideScores || hideHeadlines ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            <span className="hidden whitespace-nowrap sm:inline">{mobileProtection}</span>
          </button>
          <button type="button" onClick={() => setMyTeamsOpen(true)} aria-label={`My Teams (${favoriteTeamIds.length} selected)`}
            title={`My Teams (${favoriteTeamIds.length} selected)`}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <Heart aria-hidden="true" className={`h-4 w-4 ${favoriteTeamIds.length ? "text-emerald-300" : ""}`} />
            <span className="hidden whitespace-nowrap sm:inline">My Teams</span>
            {favoriteTeamIds.length > 0 && <span aria-hidden="true" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1 text-xs tabular-nums text-white/70">{favoriteTeamIds.length}</span>}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Spoiler settings"
            title="Spoiler settings"
            className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/5 hover:text-white sm:flex">
            <Settings aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 xl:hidden">
            {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
          </div>
        </div>
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
            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide scores and records</p>
                <p className="text-xs text-white/70 mt-1">Protects game scores, records and standings until reveal.</p>
              </div>
              <input
                type="checkbox"
                checked={hideScores}
                onChange={(event) => setHideScores(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide result headlines</p>
                <p className="text-xs text-white/70 mt-1">Protects news headlines until reveal.</p>
              </div>
              <input
                type="checkbox"
                checked={hideHeadlines}
                onChange={(event) => setHideHeadlines(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-amber-500"
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
