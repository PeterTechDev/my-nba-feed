"use client";
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
  const { spoilerFree, toggleSpoiler } = useSpoilerContext();

  return (
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
        </div>
      </div>
    </nav>
  );
}
