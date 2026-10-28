---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets:
  - "src/components/TeamHeader.tsx"
  - "src/components/TopPlaysCard.tsx"
  - "src/components/PersonalizedFeed.tsx"
  - "src/components/GameSection.tsx"
  - "src/components/GameDayHero.tsx"
---

# Homepage

Digest has been removed at the user's request. The arena now leads directly to Games, then highlights and optional news. No Digest request or link remains on this surface. Its former module and styles were deleted; news briefings remain part of the news feature.

## October 28 refinement: your courtside corner

The user requested delight and animation with a warm, tactile, personal basketball feeling. Preserve the arena composition while warming its wood and local surfaces. A compact ticket-like welcome beneath the controls names the selected team and links to Games, transferring keyboard focus to that section. Its 700ms settle belongs to the arena entrance; the basketball seam graphic rotates on hover or keyboard focus, and pressing the ticket gives a small physical response. No loops, new dependencies, audio or extra engagement flow. Reduced motion renders the ticket statically and retains color feedback. Identity bottom padding is now 40px, making room for the welcome without a separate hero section. Current local colors and the 40% team tint are recorded in DESIGN.md, superseding the earlier neutral surfaces/tint below.

Verified with desktop/mobile renders, production build, lint, TypeScript and the arena browser regression (eight widths, all 30 teams, keyboard anchor/focus response and reduced motion). Live local data services returned errors; game interaction checks used fixtures. No physical-device performance testing.

Mode: Operate, with optional Read content.

On October 27, 2026 the user requested a quieter homepage that helps fans catch up without loops of overexposure. Preserve the established dark dashboard, team identity, real content and spoiler controls.

## Direction contract

THESIS: Inside the arena. The user rejected the elastic-court widget and selected this replacement opening on October 27, 2026. The first screen is one immersive composition, rather than a large card above more cards.

OWN-WORLD: Preserve the approved amber wordmark, near-black shell, Inter and official team crests. A generated photorealistic arena illustration supplies the opening's depth; it does not document a particular team's venue or event. White team typography supplies its scale. Native controls and spoiler states remain familiar.

STORY: Recognize the selected team immediately, access its roster or change it, catch up on recent/current games, then deliberately open the finite news collection.

FIRST VIEWPORT: Compact shared navigation; edge-to-edge arena image; left-aligned city and monumental uppercase team name; a 176px crest centered on the basket support, returning to the upper right at 96px on tablet and 88px on mobile; roster, focus selector and protected record beneath the heading. The record reveals inline beside its hide action, with reserved width to preserve the header layout. The user's subsequent lower-section refinement adds a Games heading and one bounded, divided game panel below the arena, followed by secondary highlights/news choices and a closing footer. One entrance opens the arena over 950ms and brings in the identity over 800ms; both settle completely. Focus-team changes replay only the identity entrance. Reduced motion renders the final static state immediately.

FORM: Arena entrance, grounded candidate 1; seed:857a16d66f00a649. The user approved the code-led preview `.impeccable/mocks/decision/overdrive-arena.html` through the structured question. `.impeccable/overdrive/preview-arena.png` is the finish review's critique reference, not a measured comp. No further creative choice is open.

FINISH: The finish review found the approved direction matched and its design ceiling reached; its documentation correction is recorded in DESIGN.md. Shipping arena provenance is recorded in `docs/arena-atmosphere.md` and the asset's exact-prompt sidecar.

Reading order: focus team and roster access; a Games heading and a single bounded panel containing recent and upcoming/live games; secondary highlights and optional news; a quiet closing footer. Games share two desktop columns and stack in DOM order on mobile. Matchups, protected scores or tipoff and each game's actions stay together, with aligned footers. Highlights and closed news sit side by side below the panel on desktop; opening news uses the full reading width. On mobile these choices stack in DOM order. The root layout supplies the shared footer on every route, with NBA Feed home, About and Back to top links; the homepage has no duplicate footer. The home no longer reserves 100vh, so short content does not leave an artificial empty tail.

Keep “Your teams, latest news” as the entry to a native disclosure, closed by default. Without followed teams, name the focus team instead. Preserve existing story limits, deduplication, error recovery, individual reveals and the separate opt-in league disclosure. No automatic expansion, infinite scrolling or engagement prompts. Team selection and roster access stay together, with wrapping controls and 44px minimum targets.

## Shipped evidence

Implementation: `src/components/Home.module.css`, `TeamHeader.tsx`, `GameSection.tsx`, `GameDayHero.tsx` and `src/app/page.tsx`. White display names use the homepage-only 88–158px ramp (64–108px for long names); mobile sizes are bounded by the longest word. The separate city line uses 30–48px desktop and 25–36px mobile. Black scrims and the upper-arena team-primary tint preserve contrast without recoloring the court. The local scrim colors, roster-hover neutral and type ramps are deliberate surface extensions, not new defaults for other pages. This grounded arena choice has no catalog QUALITY BAR.

Final captures: `.impeccable/review/arena/desktop.png`, `user-1200.png`, `mobile.png`, `narrow.png`, `long-team-mobile.png`, `lakers-desktop.png` and `news-mobile.png`. Build, lint and 36 unit tests passed; `tests/arena-home-regression.mjs` passed eight widths, all 30 team names, and interaction/error states. Validation used browser emulation; real hardware was not tested.

Latest lower-section captures: `.impeccable/review/second-section/user.png` (1139px, matching the user's reference), `desktop.png`, `mobile.png`, `narrow.png` and `news-open.png`. Manual layout/polish checks and the layout detector passed. Browser regression also verifies full-width keyboard-opened news, the page ending at its footer and the Back to top anchor. Build, lint and all 36 unit tests passed after this refinement.
