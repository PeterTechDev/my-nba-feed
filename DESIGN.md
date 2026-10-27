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

**Creative North Star: "The dark basketball dashboard"**

An implementation-derived description of the incumbent interface, not a new visual identity. Near-black surfaces, Inter, compact statistics and team imagery give fans a consistent low-light environment. Amber identifies protection and selected links; team colors remain contextual and change with the chosen team.

**Key Characteristics:**
- Dark, compact and readable.
- Quiet borders and tonal surfaces.
- Team identity and explicit spoiler controls.

Sources: `src/app/globals.css`, `tailwind.config.ts`, root layout, shared navigation, TeamHeader, TeamSelector, MorningBriefingCard, GameDayHero, ScoreReveal, Modal, roster, comparison and digest views. Surface-specific About composition remains in `.impeccable/surfaces/src-app-about-page-tsx.md`.

## Brand Identity

The user approved **Option C — The Feed** for the **My NBA Feed** logo on October 27, 2026. Its mark combines three horizontal amber feed bars with curved basketball seams, paired with a condensed bold wordmark. The stacked dark version is the primary asset; horizontal dark, stacked light and standalone-mark variations are saved alongside it in `public/branding/`. See [docs/branding.md](docs/branding.md) for the asset inventory, usage guidance and generation provenance.

The logo's intended colors are amber `#FBBF24`, off-white `#FAFAFA` and near-black `#0A0A0A`. These raster assets do not change application color tokens, Inter typography or contextual team colors. The condensed lettering belongs to the logo only. The shared navigation displays the primary stacked logo; a 64px ICO encoded from the standalone mark supplies the browser favicon. Application copy retains NBA Feed as its short name.

## Colors

### Primary
- **Amber link** identifies protection controls, contextual warnings and selected reading links. **Amber focus** marks global keyboard focus, selection and native control accents.
- Team primary and secondary are runtime CSS custom properties (`--team-primary`, `--team-secondary`) updated by TeamThemeProvider from team data. Their initial Celtics values are fallbacks, not fixed brand colors.

### Neutral
- **Canvas** is the page and navigation ground; **panel** and **dialog** distinguish content and overlays; **field** supports native selectors.
- **Text** is the effective root foreground. **Text muted** carries supporting information; **divider** is also the common subdued-control fill. **Panel border** outlines dashboard cards.
- Emerald and red communicate existing followed-team, upcoming-game and live-game states. Digest style badges have local category colors; these do not replace the neutral shell.

## Typography

Inter is loaded through `next/font/google` and exposed by `--font-inter`; Tailwind's sans family uses it throughout. Headlines commonly use the frontmatter headline role, reaching 30px on the team header at small screens and above. Panel titles use 16px semibold; body copy and navigation use 14px; compact labels use 12px. Larger editorial type on About is a surface-specific extension, not a new global display scale. Scores use tabular numerals.

## Layout

Page containers are centered at a maximum width of 1152px, generally with 16px padding that becomes 32px at the 640px breakpoint. Dashboard gaps are commonly 16px, with 24px/32px between sections. Cards use 16px–24px internal padding. Dashboard columns expand at 768px and 1024px; roster cards collapse to divided disclosure rows on mobile. Navigation uses a menu below 1280px and a single row above it. Main controls generally provide a minimum 44px height.

## Elevation & Depth

The sampled system uses tonal surfaces and thin borders without box shadows. Native dialogs sit over a black 75% backdrop, use a 16px radius and cap their height at 85dvh. Global focus is a 2px amber outline offset by 4px. Interaction transitions use the existing motion variables; entrance and reveal animations honor reduced motion.

## Shapes

Controls have 8px corners, cards and selectable team tiles 12px, dialogs and team headers 16px. Fully rounded forms are reserved for compact status marks, counts and category badges. Borders are ordinarily 1px; selected team tiles use a 2px team-colored border.

## Components

- **Buttons:** subdued white-tint fill for focus-team selection and retry; outlined reveal controls; transparent navigation actions. Hover strengthens the fill or foreground. Keep the global focus treatment.
- **Cards:** dark panel, quiet border and 12px corners. Use the existing flat section/list patterns where the surface already calls for them.
- **Fields:** comparison uses native selects with a dark field fill, 8px corners and a 44px minimum height. Spoiler settings use native amber-accented checkboxes.
- **Navigation:** sticky canvas-colored shell, 64px minimum row and the approved stacked logo in a 112px × 44px frame that hides its canvas margins. The home link's image has the accessible name My NBA Feed. Desktop uses 14px text links and a separate utility group with a thin divider. Active links use a white-tint fill and `aria-current`. Protection uses amber text; followed teams use an emerald heart with an inline neutral count. Below 640px, compact utilities keep accessible names and tooltips while their text labels are hidden. The small-screen menu uses a two-column link grid with 16px icons.
- **Badges:** compact fully rounded digest category labels; selected-team counts and live dots remain small status treatments.
- **Team header:** a team-colored band with a contrast-selected foreground, real team logo and a neutral inset for controls.

## Do's and Don'ts

### Do:
- **Do** reuse the dark shell, Inter and shared controls when extending the interface.
- **Do** preserve keyboard focus visibility and reduced-motion behavior.
- **Do** resolve team colors from the selected team rather than treating a fallback as the brand.

### Don't:
- **Don't** promote an individual page's composition or type size into a global requirement.
- **Don't** add shadow-based elevation to represent the sampled flat dashboard surfaces.
