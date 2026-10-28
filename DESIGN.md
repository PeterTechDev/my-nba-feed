---
name: NBA Feed
description: The existing dark basketball dashboard, captured from implementation.
colors:
  canvas: "#0a0a0a"
  panel: "#161616"
  dialog: "#141414"
  field: "#1a1a1a"
  panel-border: "#2a2a2a"
  text: "#ffffff"
  text-muted: "rgba(255,255,255,0.7)"
  divider: "rgba(255,255,255,0.1)"
  control-hover: "rgba(255,255,255,0.2)"
  amber-link: "#fcd34d"
  amber-focus: "#fbbf24"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  button-subdued:
    backgroundColor: "{colors.divider}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-subdued-hover:
    backgroundColor: "{colors.control-hover}"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "16px"
  select:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: NBA Feed

## Overview

Digest and standings pages, APIs, navigation entries and publication jobs have been removed. The homepage goes directly from the arena to Games. Shared storage in `src/lib/blobStorage.ts` serves highlights and API quota state; historical documents are untouched. Team records and game results remain available under spoiler protection.

**Creative North Star: "The dark basketball dashboard"**

An implementation-derived description of the incumbent interface, not a new visual identity. Near-black surfaces, Inter, compact statistics and team imagery give fans a consistent low-light environment. Amber identifies protection and selected links; team colors remain contextual and change with the chosen team.

**Key Characteristics:**
- Dark, compact and readable.
- Quiet borders and tonal surfaces.
- Team identity and explicit spoiler controls.

Sources: `src/app/globals.css`, `tailwind.config.ts`, root layout, shared navigation, TeamHeader, TeamSelector, MorningBriefingCard, GameDayHero, ScoreReveal, Modal, roster, highlights and Top Plays views. Surface-specific About composition remains in `.impeccable/surfaces/src-app-about-page-tsx.md`.

## Brand Identity

The user approved **Option C — The Feed** for the **My NBA Feed** logo on October 27, 2026. Its mark combines three horizontal amber feed bars with curved basketball seams, paired with a condensed bold wordmark. The stacked dark version is the primary asset; horizontal dark, stacked light and standalone-mark variations are saved alongside it in `public/branding/`. See [docs/branding.md](docs/branding.md) for the asset inventory, usage guidance and generation provenance.

The logo's intended colors are amber `#FBBF24`, off-white `#FAFAFA` and near-black `#0A0A0A`. These raster assets do not change application color tokens, Inter typography or contextual team colors. The condensed lettering belongs to the logo only. The shared navigation displays the primary stacked logo; a 64px ICO encoded from the standalone mark supplies the browser favicon. Application copy retains NBA Feed as its short name.

## Colors

### Selected-team interface roles (October 28, 2026)

TeamThemeProvider retains the official primary/secondary values for arena tint and derives `--team-accent-base` / `--team-detail-base` through the existing getChartColor helper. Interface accents mix those bases with 20% white for contrast. `--team-surface` and its hover mix the accent at 12% and 16% over #101010. These shared roles color active navigation (also underlined), the focus-team selector, homepage roster action and the courtside ticket. The ticket's ball/separator and second arena beam use the secondary detail color. Calendar game dates and protected/upcoming game blocks use the accent; today uses a filled marker. Roster position/jersey details carry the accent on desktop and mobile. Official logos, brand amber, spoiler controls and outcome/status colors keep their existing roles. This supersedes the homepage's fixed cream action and ticket palette described below.

Historical validation for this palette change: all 30 palettes passed browser-computed contrast checks for action text, accent text and hover (4.5:1), secondary icons (3:1), and narrow-screen overflow. Desktop/mobile visual review covered home, schedule and the subsequently removed standings page with fixtures; the arena regression and 468 unit tests passed at that time. Physical devices were not tested.

### Primary
- **Amber link** identifies protection controls, contextual warnings and selected reading links. **Amber focus** marks global keyboard focus, selection and native control accents.
- Team primary and secondary are runtime CSS custom properties (`--team-primary`, `--team-secondary`) updated by TeamThemeProvider from team data. Their initial Celtics values are fallbacks, not fixed brand colors.

### Neutral
- **Canvas** is the page and navigation ground; **panel** and **dialog** distinguish content and overlays; **field** supports native selectors.
- **Text** is the effective root foreground. **Text muted** carries supporting information; **divider** is also the common subdued-control fill. **Panel border** outlines dashboard cards.
- Emerald and red communicate existing followed-team, upcoming-game and live-game states; these do not replace the neutral shell.
- The homepage arena uses local black scrims (`#0009`/`#0002` on desktop, `#000a`/`#0005` on mobile) and an opaque-black-to-transparent mask (`#000`) to keep the white identity legible. A 65% team-primary color blend is masked above the court so its wood remains natural. The roster action's pale hover (`#e5e5e5`) is also local. These image and control treatments do not extend the global palette.

## Typography

Inter is loaded through `next/font/google` and exposed by `--font-inter`; Tailwind's sans family uses it throughout. Compact headlines use the frontmatter headline role. Panel titles use 16px semibold; body copy and navigation use 14px; compact labels use 12px. Scores use tabular numerals.

The homepage arena is a scoped display extension: white uppercase Inter team names (weight 850, line height 0.95, tracking -0.035em) use `clamp(88px, 11vw, 158px)`, with `clamp(64px, 7.5vw, 108px)` for names longer than ten characters. The city is a separate large line (weight 500, `clamp(30px, 3.5vw, 48px)`). Below 768px, the team ramps become 64–100px and 48–76px respectively, each capped by the available width divided by the longest word's letter count and a 0.74 width allowance; the city uses `clamp(25px, 6vw, 36px)`. These bounds permit long names to shrink below the nominal ramp rather than overflow. Neither this display scale nor About's editorial type changes the global roles.

## Layout

Page containers are centered at a maximum width of 1152px, generally with 16px padding that becomes 32px at the 640px breakpoint. Dashboard gaps are commonly 16px, with 24px/32px between sections. Cards use 16px–24px internal padding. Dashboard columns expand at 768px and 1024px; roster cards collapse to divided disclosure rows on mobile. Navigation uses a menu below 1280px and a single row above it. Main controls generally provide a minimum 44px height.

The approved homepage opening is a full-width photographic arena hero with content aligned to the existing container. Its height uses `clamp(440px, 39vw, 560px)` on desktop and a 480px minimum below 768px. City and team name lead on the left; the 176px official crest is centered over the basket support, with its center anchored at 89.3% of the hero width and `calc(60% + 1vw)` from the top to follow the image crop. Below 1024px it returns to the upper right at 96px, becoming 88px below 768px to keep the name and controls clear. Wrapping roster, focus-team and protected-record controls sit beneath the identity. The record reserves 184px and reveals inline beside Hide record, preserving control alignment and hero height. Below the hero, Games introduces one panel using the existing panel ground, border and 12px radius. Two divided columns become one below 768px; each game groups its matchup, result or time and an aligned action footer. Highlights and closed news form a quieter two-column secondary area, stacking on mobile and expanding to full reading width when news opens. A restrained shared footer closes the page. The home uses its content height rather than a forced 100vh tail. This composition is specific to the homepage; other pages retain their existing layouts.

## Elevation & Depth

Homepage refinement, October 28, 2026: the user's warm, personal basketball direction adds a local `#100e0c` ground, `#1b1814` panels with `#383027` borders, and a cream `#f5e6cf` roster action. Arena team tint is now 40%, retaining more natural wood. A compact courtside welcome below the controls borrows an admission ticket's perforated separator; its copy follows the focus team and its native anchor focuses Games. It settles once over 700ms, with a small basketball rotation on hover/keyboard focus and a pressed response. News opening reuses the existing reveal keyframes. All spatial effects are omitted for reduced motion. These are homepage-only extensions; the shared shell is unchanged.

The sampled system uses tonal surfaces and thin borders without box shadows. Native dialogs sit over a black 75% backdrop, use a 16px radius and cap their height at 85dvh. Global focus is a 2px amber outline offset by 4px. Interaction transitions use the existing motion variables; entrance and reveal animations honor reduced motion.

The homepage's depth comes from the generated photographic arena, black scrims and masked team-color lighting. One entrance opens the arena image over 950ms while the identity arrives over 800ms, both using the shared easing; the identity entrance also runs when the focus team changes. They settle completely without an ambient loop. Reduced motion starts in the final static state immediately.

## Shapes

Controls have 8px corners, cards and selectable team tiles 12px, and dialogs 16px. The full-width homepage arena is square-edged; its Games panel uses the existing 12px card radius without separately enclosing each game. Fully rounded forms are reserved for compact status marks, counts, category badges and the current calendar date. Borders are ordinarily 1px; selected team tiles use a 2px contrast-adjusted team-colored border and an amber checkmark.

## Components

- **Buttons:** subdued white-tint fill for focus-team selection and retry; outlined reveal controls; transparent navigation actions. Hover strengthens the fill or foreground. Keep the global focus treatment.
- **Cards:** dark panel, quiet border and 12px corners. Use the existing flat section/list patterns where the surface already calls for them.
- **Fields:** native selectors use a dark field fill, 8px corners and a 44px minimum height. Spoiler settings use native amber-accented checkboxes.
- **Dialogs:** a sticky title and Close control stay visible above the scrolling content. Scroll padding keeps focused choices clear of the header.
- **Reading and scrolling:** news uses finite lists and opt-in disclosures. Scrollbars use neutral gray on panel gray, and page anchor scrolling leaves room for the sticky navigation. Highlight previews retain their 16:9 proportions at every breakpoint.
- **Navigation:** sticky canvas-colored shell, 64px minimum row and the approved stacked logo in a 112px × 44px frame that hides its canvas margins. The home link's image has the accessible name My NBA Feed. Desktop uses 14px text links and a separate utility group with a thin divider. Active links use a white-tint fill and `aria-current`. Protection uses amber text; followed teams use an emerald heart with an inline neutral count. Below 640px, compact utilities keep accessible names and tooltips while their text labels are hidden. The small-screen menu uses a two-column link grid with 16px icons.
- **Badges:** selected-team counts and live dots remain small, compact status treatments.
- **Footer:** shared across all routes through the root layout, with a full-width dark ground and top border to mark the application's end. The container-aligned upper row groups NBA Feed home with About, GitHub and LinkedIn. A quieter lower row carries the year, Peter Souza attribution, independent-project note and Back to top. Professional links reuse the documented author profiles, use Lucide icons and name their new-tab behavior. Links retain 44px targets and rows stack on narrow screens. The homepage has no duplicate footer inside its content.
- **Team header:** the homepage's photographic arena composition, white city and display team name, official crest and familiar native controls. The white roster link, bordered focus-team selector and protected-record reveal wrap together with 44px minimum targets. Preserve explicit record and score protection. The arena is generic generated atmosphere, not an image of the selected team's actual venue; provenance is in [docs/arena-atmosphere.md](docs/arena-atmosphere.md).

## Do's and Don'ts

### Do:
- **Do** reuse the dark shell, Inter and shared controls when extending the interface.
- **Do** preserve keyboard focus visibility and reduced-motion behavior.
- **Do** resolve team colors from the selected team rather than treating a fallback as the brand.

### Don't:
- **Don't** promote an individual page's composition or type size into a global requirement.
- **Don't** add shadow-based elevation to represent the sampled flat dashboard surfaces.
