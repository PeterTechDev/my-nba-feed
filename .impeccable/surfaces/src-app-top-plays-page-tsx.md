---
version: 1
slug: "src-app-top-plays-page-tsx"
primary_target: "src/app/top-plays/page.tsx"
related_targets: ["src/app/top-plays/top-plays.module.css", "src/app/top-plays/layout.tsx", "src/components/NavBar.tsx", "src/components/TopPlaysCard.tsx"]
---

# Top Plays

Mode: Experience. A league-wide nightly viewing page, in the existing NBA Feed design system. The user approved newest first, followed by previous nights, mixing Top 10 and Top 5. Keep English UI consistent with the app. Use official NBA uploads, daily sync, and existing spoiler defaults.

## Direction contract

THESIS: The user-approved “Cinema da noite” gives the latest nightly countdown a full-container viewing stage, followed by quieter previous nights. Reveal protected media deliberately, then play inline.

OWN-WORLD: Preserve the dark canvas, Inter, amber action/focus, quiet dividers and 12px media corners. Real NBA thumbnails carry the imagery. The large Inter heading, amber period and featured play control are local cinematic emphasis, not new global tokens.

STORY: Find the date and countdown length, deliberately reveal protected media, play inline or open YouTube, then choose another night.

FIRST VIEWPORT: A 48–96px Inter heading with an amber period opens above the full-container 16:9 latest-video stage. Its title, date and actions sit below. Previous nights form a quiet three-column gallery, two columns below 768px, then compact thumbnail-and-caption rows below 480px. Playing a compact row expands it to a full-width player; closing restores the row.

FORM: User-approved overdrive enhancement “Cinema da noite,” scoped to this existing surface. Featured previews reveal over 650ms; playback opens with a 650ms curtain and 450ms player fade. Motion is finite and disabled under reduced motion. No new font, generated art, or global design change.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Shipped evidence

Cinema finish review (`cinema_review`): **ship**, with no fixes requested. The implementation retains the existing canvas, Inter, amber links/focus, flat dividers, 12px media corners and 1152px container. The display heading, viewing stage and finite motion remain local; DESIGN.md and the pre-existing design sidecar remain unchanged.

Current review captures: `.impeccable/review/top-plays-{desktop,390,320,protected,empty,error}.png`, `top-plays-cinema-player.png` and `top-plays-cinema-archive-player.png`. The fixture motion record is `.impeccable/review/top-plays-motion.json`; the durable regression test `tests/top-plays-regression.mjs`, lint and build passed. These captures use synthetic nightly metadata and an existing NBA thumbnail solely as a UI fixture, not as published countdown data. Production thumbnails come from official NBA uploads through the daily YouTube sync; no new raster asset was generated or shipped. Live YouTube playback and real-device performance were not certified.

The shared navigation and homepage's More from the NBA disclosure link here. Protected previews require reveal before playback; Close player restores the preview, and Hide preview removes the player. Empty and error states retain the official-channel search fallback.
