import Link from "next/link";
import { ArrowUp, Github, Linkedin } from "lucide-react";

export default function Footer() {
  const year = new Date().toLocaleDateString("en-US", { year: "numeric", timeZone: "America/Bahia" });

  return (
    <footer className="border-t border-white/10 bg-[#080808] text-sm text-white/70">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link href="/" aria-label="NBA Feed home" className="inline-flex min-h-11 items-center self-start text-base font-semibold text-white/90 hover:text-white">NBA Feed</Link>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5">
            <Link href="/about" className="inline-flex min-h-11 items-center hover:text-white">About</Link>
            <a href="https://github.com/PeterTechDev" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-amber-300">
              <Github aria-hidden="true" className="h-4 w-4" />GitHub<span className="sr-only">(opens in a new tab)</span>
            </a>
            <a href="https://linkedin.com/in/peter-souza" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-amber-300">
              <Linkedin aria-hidden="true" className="h-4 w-4" />LinkedIn<span className="sr-only">(opens in a new tab)</span>
            </a>
          </nav>
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="text-xs leading-5">
            <p>© {year} NBA Feed · Built by Peter Souza.</p>
            <p>Independent project. Not affiliated with the NBA.</p>
          </div>
          <a href="#main-content" className="inline-flex min-h-11 items-center gap-2 self-start text-xs hover:text-white sm:self-auto">Back to top<ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /></a>
        </div>
      </div>
    </footer>
  );
}
