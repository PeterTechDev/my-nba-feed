import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/about", {
  title: "About",
  description: "Basketball on your terms. Learn about NBA Feed, spoiler protection, our sources and the person behind the project.",
});

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16">
      <header className="max-w-3xl pb-10 sm:pb-16">
        <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
          Basketball.<br />On your terms.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
          Your teams, the stories around them, and the games you’re saving for later.
          NBA Feed brings it together, with control over what you see.
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm font-medium text-amber-300 underline-offset-4 hover:underline">
          Go to your feed <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>

      <div className="grid gap-10 border-t border-white/10 py-10 sm:grid-cols-2 sm:gap-16 sm:py-14">
        <section aria-labelledby="your-teams">
          <h2 id="your-teams" className="text-2xl font-semibold tracking-tight">A home for your teams.</h2>
          <p className="mt-4 leading-7 text-white/70">
            Catching up should be simple. NBA Feed puts team news, game information,
            highlights and fan conversations within reach, without an endless feed
            of recommendations.
          </p>
          <p className="mt-4 leading-7 text-white/70">
            Follow your favorites in <span className="font-medium text-white">My Teams</span>.
            Choose a focus team on the home page for its last game, next matchup
            and news. Explore the schedule, standings and player rosters when you
            want the wider picture.
          </p>
        </section>
        <section aria-labelledby="spoiler-protection">
          <h2 id="spoiler-protection" className="text-2xl font-semibold tracking-tight">The result can wait.</h2>
          <p className="mt-4 leading-7 text-white/70">
            Watching later? Scores and result headlines are hidden by default.
            Reveal a game, post, video preview or digest when you’re ready;
            revealing an item keeps your default protection in place.
          </p>
          <p className="mt-4 leading-7 text-white/70">
            Use <span className="font-medium text-white">Spoiler settings</span> in
            the navigation to control scores and headlines separately. Your choices
            are remembered in this browser.
          </p>
          <p className="mt-4 text-sm leading-6 text-amber-200/90">
            Protection applies inside NBA Feed. External articles, search results
            and videos may reveal results.
          </p>
        </section>
      </div>

      <section aria-labelledby="sources" className="border-t border-white/10 py-10 sm:py-14">
        <div className="grid gap-6 sm:grid-cols-[1fr_2fr] sm:gap-16">
          <div>
            <h2 id="sources" className="text-2xl font-semibold tracking-tight">Where the feed<br className="hidden sm:block" /> comes from.</h2>
            <p className="mt-4 text-sm leading-6 text-white/70">Different sources, brought together.<br />Follow stories back to their publishers.</p>
          </div>
          <div>
            <dl className="divide-y divide-white/10 text-sm leading-6">
              <div className="pb-4">
                <dt className="font-medium">Games, standings & players</dt>
                <dd className="mt-1 text-white/70">BALLDONTLIE supplies game and team data. ESPN provides a roster fallback.</dd>
              </div>
              <div className="py-4">
                <dt className="font-medium">News & community</dt>
                <dd className="mt-1 text-white/70">News comes through Google News RSS. Fan discussions come from Reddit, with RSS and indexed links as fallbacks.</dd>
              </div>
              <div className="py-4">
                <dt className="font-medium">Highlights</dt>
                <dd className="mt-1 text-white/70">Videos from the NBA’s YouTube channel, with YouTube search available when a matched video isn’t available.</dd>
              </div>
              <div className="pt-4">
                <dt className="font-medium">Daily digest</dt>
                <dd className="mt-1 text-white/70">AI-generated basketball briefings with source details in each edition. AI can make mistakes; check the linked sources for the full picture.</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm leading-6 text-white/70">Updates depend on upstream sources and may be delayed or temporarily unavailable.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="creator" className="grid gap-6 border-t border-white/10 pt-10 sm:grid-cols-[1fr_2fr] sm:gap-16 sm:pt-14">
        <h2 id="creator" className="text-2xl font-semibold tracking-tight">Built by Peter Souza.</h2>
        <div>
          <p className="leading-7 text-white/70">SDET. AI Developer. Building in public.</p>
          <p className="mt-3 max-w-2xl leading-7 text-white/70">NBA Feed is an independent project built around a simple idea: following your team should fit your day, even when tipoff doesn’t.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-amber-300">
            <a href="https://github.com/PeterTechDev/my-nba-feed" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline">View the project on GitHub</a>
            <a href="mailto:peterleite.dev@gmail.com" className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline">Get in touch</a>
          </div>
          <p className="mt-6 text-sm leading-6 text-white/70">NBA Feed is not affiliated with or endorsed by the NBA or its teams. Team names, logos and linked content belong to their respective owners.</p>
        </div>
      </section>
    </main>
  );
}
