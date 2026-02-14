"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home", icon: "🏀" },
  { href: "/players", label: "Players", icon: "👤" },
  { href: "/standings", label: "Standings", icon: "📊" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/highlights", label: "Highlights", icon: "🎬" },
  { href: "/compare", label: "Compare", icon: "⚔️" },
  { href: "/social", label: "Social", icon: "💬" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          <Link href="/" className="text-lg font-bold mr-4 shrink-0" style={{ color: "var(--team-primary)" }}>
            NBA Feed
          </Link>
          {links.map((link) => {
            const active = pathname === link.href;
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
                <span className="text-xs">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
