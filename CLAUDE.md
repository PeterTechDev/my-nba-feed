# My NBA Feed — Agent Instructions

> Team-focused NBA dashboard with spoiler protection.
> Live at https://my-nba-feed.vercel.app

## Purpose
NBA dashboard for a selected focus team and multiple followed teams: games, recaps, nightly top plays, news and active rosters. Boston is the initial selection; all 30 teams are supported. Preferences are stored in the browser.

## Stack
- **Next.js 16.4.3** (installed version, App Router) + React 18 + TypeScript
- **Tailwind CSS 3** + Zustand (persisted teams) + React context (games/protection)
- **Lucide React** for icons
- **Vercel** deploy
- **Private Vercel Blob** for quota reservations and video metadata

## Key Routes
- `/` — Main feed (team header, game day hero, next/last game, top plays, news)
- `/highlights` — Video/play highlights
- `/schedule` — Season schedule
- `/players` — Active roster and profile details, not performance statistics
- `/top-plays` — Official NBA nightly Top 5/10 countdowns
- `/about` — Product and creator
- `src/app/api/` — Games, live games, news, schedule, players and highlights

## Key Files
- `src/components/TeamHeader.tsx` — Arena header with selected-team identity
- `src/components/GameDayHero.tsx` — Today's game featured card
- `src/components/GameSection.tsx` — Last/next game cards
- `src/components/GameDataProvider.tsx` — Data fetching wrapper
- `src/components/NewsFeed.tsx` — NBA news list
- `src/components/PersonalizedFeed.tsx` — Followed-team news and league coverage
- `src/components/SpoilerModeProvider.tsx` — Shared spoiler preferences
- `src/lib/ballDontLie.ts` — Cached provider requests and shared quota guard
- `src/lib/blobStorage.ts` — Private documents with conditional writes
- `src/lib/teams.ts` — Team IDs, colors and local logo paths

## Run
Use Node 22.21.1 (CI version; package minimum 22.9.0).

```powershell
npm ci
Copy-Item .env.example .env.local # Only if the file does not already exist
# Configure server credentials as described in README.md before starting.
npm run dev   # http://localhost:3000
```

See [README.md](README.md) for environment variables, API contracts and checks.
Main CI runs `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
`npm run test:ssr` needs a current production build or an explicit `BASE_URL`.
Playwright needs Chromium and a running app via `BASE_URL`; preview-only specs
are selected with `PLAYWRIGHT_PREVIEW=1`.

## Data operations

- BALLDONTLIE requests need the API key and working private Blob access. Quota is shared across instances: five calls per rolling minute.
- Official YouTube recaps and countdowns are synchronized at minute 15. Visitors never call the YouTube Data API.
- The highlights publisher authenticates with the retained `DIGEST_PUBLISH_TOKEN` name. `npm run highlights:sync` targets production; do not run it as a read-only check.
- Digest and standings pages, APIs and publication jobs have been removed. Do not restore them as part of unrelated work.
- Operational guides: [cache and quota](docs/api-cache.md), [YouTube sync](docs/youtube-highlights.md).

## Notes
- Keep the UI clean and fast — this is a personal dashboard, not a commercial product
- Read [AGENTS.md](AGENTS.md) and the relevant bundled Next.js guide in `node_modules/next/dist/docs/` before changing code.
- Preserve score and headline protection, individual reveals, confirmation before disabling protection, keyboard access and reduced-motion behavior.
- Server redaction covers `/api/games` and `/api/news`; other result endpoints are not spoiler-redacted.
- Full-game thumbnails remain visible; protected Top Plays previews require reveal. External media may expose results.
- Follow [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) and the linked asset guides for interface changes.
