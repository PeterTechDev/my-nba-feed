"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, Calendar, Play, ArrowLeftRight, MessageCircle, Eye, EyeOff, Menu, X, Settings, BookOpen, Heart, Info } from "lucide-react";
import Modal from "./Modal";
import FavoriteTeamsModal from "./FavoriteTeamsModal";
import { useFavoriteTeams } from "@/hooks/useFavoriteTeams";
import { useSpoilerContext } from "./SpoilerModeProvider";

function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  const focusable = [...dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function RevealSpoilersDialog({ onDismiss, onConfirm, returnFocusRef }: {
  onDismiss: () => void;
  onConfirm: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const opener = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
      else if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      id="reveal-spoilers"
      aria-labelledby="reveal-spoilers-title"
      aria-describedby="reveal-spoilers-description"
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onKeyDown={trapDialogFocus}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#141414] p-0 text-white backdrop:bg-black/75"
    >
      <form className="p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); onDismiss(); }}>
        <h2 id="reveal-spoilers-title" className="text-xl font-bold">Show scores and headlines?</h2>
        <p id="reveal-spoilers-description" className="mt-2 text-sm text-white/70">Scores, records and headlines will show across NBA Feed. This choice is saved in this browser.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="submit" className="min-h-11 w-full rounded-lg bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20 sm:w-auto">
            Keep hidden
          </button>
          <button type="button" onClick={onConfirm} className="min-h-11 w-full rounded-lg border border-white/15 px-4 text-sm font-medium text-amber-300 hover:bg-amber-500/10 sm:w-auto">
            Show scores and headlines
          </button>
        </div>
      </form>
    </dialog>
  );
}

const links = [
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
  const { spoilerFree, hideScores, hideHeadlines, toggleSpoiler, setHideScores, setHideHeadlines, showScoresAndHeadlines } = useSpoilerContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [myTeamsOpen, setMyTeamsOpen] = useState(false);
  const { favoriteTeamIds } = useFavoriteTeams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealNotice, setRevealNotice] = useState(false);
  const protectionButtonRef = useRef<HTMLButtonElement>(null);
  const mobileProtection = spoilerFree ? "Spoilers hidden" : hideScores ? "Scores hidden" : hideHeadlines ? "Headlines hidden" : "Spoilers shown";
  const protection = `${mobileProtection} by default`;

  useEffect(() => {
    if (revealNotice && (hideScores || hideHeadlines)) setRevealNotice(false);
  }, [hideScores, hideHeadlines, revealNotice]);

  useEffect(() => {
    setConfirmReveal(false);
  }, [pathname]);

  function onProtectionClick() {
    if (spoilerFree) {
      setConfirmReveal(true);
      return;
    }
    toggleSpoiler();
    setRevealNotice(false);
  }

  function confirmShowSpoilers() {
    showScoresAndHeadlines();
    setRevealNotice(true);
    setConfirmReveal(false);
  }

  function hideAgain() {
    if (spoilerFree) return;
    toggleSpoiler();
    setRevealNotice(false);
    protectionButtonRef.current?.focus();
  }

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
          <button ref={protectionButtonRef} type="button" onClick={onProtectionClick}
            aria-haspopup={spoilerFree ? "dialog" : undefined}
            aria-controls={confirmReveal ? "reveal-spoilers" : undefined}
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
      <div role="status" aria-live="polite" aria-atomic="true" className={revealNotice ? "border-t border-white/10" : "sr-only"}>
        {revealNotice && (
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:px-8">
            <span className="text-sm text-white">Scores and headlines are shown.</span>
            <button type="button" onClick={hideAgain} className="min-h-11 rounded-lg px-3 text-sm font-medium text-amber-300 hover:bg-amber-500/10">
              Hide again
            </button>
          </div>
        )}
      </div>
    </nav>
    {settingsOpen && (
      <Modal title="Spoiler settings" onClose={() => setSettingsOpen(false)}>
          <p className="text-sm text-white/70">Choose what stays hidden by default. Revealing a post, digest or results view shows only that content without changing these defaults.</p>
          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Hide scores and records</p>
                <p className="text-xs text-white/70 mt-1">Protects game scores, records, standings and comparison statistics until reveal.</p>
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
                <p className="text-xs text-white/70 mt-1">Protects news headlines and all social titles and images until reveal.</p>
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
    {confirmReveal && (
      <RevealSpoilersDialog
        returnFocusRef={protectionButtonRef}
        onDismiss={() => setConfirmReveal(false)}
        onConfirm={confirmShowSpoilers}
      />
    )}
    </>
  );
}
