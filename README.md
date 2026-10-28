# 🏀 My NBA Feed

<img src="public/branding/my-nba-feed-logo-stacked-dark.png" alt="My NBA Feed — amber basketball feed mark and stacked wordmark" width="480">

**Live →** [my-nba-feed.vercel.app](https://my-nba-feed.vercel.app)

Development, configuration and checks are documented below. Operational details:
[API cache and quota](docs/api-cache.md) · [YouTube sync](docs/youtube-highlights.md).

---

## The Problem

Modern sports apps aren't built for fans — they're built for engagement metrics.

You open the NBA app to check one score and get hit with ads, push notification prompts, recommended content you didn't ask for, and an algorithm trying to keep you scrolling. Reddit buries the game thread under memes and hot takes. ESPN wants you to subscribe. Google shows you highlights you didn't want to see yet.

The result: checking on your team becomes a chore. You either get spoiled, get distracted, or give up and wait for someone to tell you.

## The Solution

NBA Feed cuts all of that out.

One page. Your team. The score, the record, the next game and the schedule — with spoiler-free mode on by default so you control when you see results. No ads. No algorithm. No recommendations. No paywall. No FOMO loop.

Just basketball, on your terms.

---

## Features

- **Team Dashboard** — Last, current and next game, plus the selected team's W/L record. Game data refreshes every 30 seconds, subject to source availability and shared quota.
- **Followed Teams and News** — Choose a focus team and follow multiple teams. Open a finite news feed when ready, with related coverage grouped together.
- **Schedule** — Calendar and agenda views, Google Calendar links and game recaps.
- **Highlights and Top Plays** — Official NBA full-game recaps and nightly Top 5/10 countdowns, synchronized hourly and played on demand.
- **Roster** — Active players and their profile details, with an ESPN fallback. Box scores and player performance statistics are not implemented.
- **Spoiler Protection** — Scores, records and spoiler headlines are hidden by default, with separate settings and individual reveals. Turning protection off asks for confirmation.
- **Team Selector** — All 30 NBA teams, local official logos and contextual team colors. The focus team, followed teams and protection settings are saved in this browser; Boston is the initial focus team.

External articles, video thumbnails, playback and YouTube can reveal results.
Full-game thumbnails remain visible with protection enabled; Top Plays previews
require a reveal while protection is enabled. The app has no advertising of its
own, but embedded YouTube videos may show ads and recommendations.

---

## Brand and Logo

**Option C — The Feed** is the approved logo direction, selected on October 27, 2026:
an amber basketball/feed mark with a condensed **My NBA Feed** wordmark. The primary
logo and horizontal, light-background and standalone-mark variations are saved in
[`public/branding/`](public/branding/). See the [brand guide](docs/branding.md) for
asset links, intended uses, generation prompts and current limitations.

The shared navigation displays the primary stacked logo, and the standalone mark
is encoded as the browser favicon. Application copy continues to use **NBA Feed**
as its short name.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.4.3 (App Router, installed version) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS 3, Lucide React |
| State | Zustand for persisted team choices; React context for games and spoiler settings |
| Data | BALLDONTLIE, Google News RSS, ESPN roster fallback, official NBA YouTube uploads |
| Storage | Private Vercel Blob documents and Next.js Data Cache |
| Deployment | Vercel |

---

## Project Structure

```
src/app/                     # Pages, metadata and API route handlers
src/components/              # Arena header, games, news, media and shared controls
src/hooks/                   # Team preferences, spoiler state and shared fetching
src/lib/                     # Data contracts, sources, dates, quota and Blob helpers
scripts/                     # YouTube publisher
tests/                       # Node tests, local Playwright specs and regressions
tests/preview/               # Playwright checks for deployed previews
.github/workflows/           # CI, preview checks and hourly data syncs
public/                      # Branding, arena image and local NBA team logos
docs/                        # Operations and asset guides
```

| Page | Purpose |
|---|---|
| `/` | Focus-team dashboard, games, highlights and opt-in news |
| `/schedule` | Team calendar and agenda |
| `/highlights` | Full-game videos for the selected team |
| `/top-plays` | Nightly NBA Top 5/10 countdowns |
| `/players` | Selected team's active roster |
| `/about` | Product purpose and creator |

---

## Getting Started

Use Node.js **22.21.1**, the version used in CI, and npm. `package.json` requires
Node.js `>=22.9.0`.

```powershell
# Clone
git clone https://github.com/PeterTechDev/my-nba-feed.git
cd my-nba-feed

# Install
npm ci

# Copy the environment template (do not overwrite an existing .env.local)
Copy-Item .env.example .env.local

# Fill in .env.local, then start the app

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On macOS/Linux, use `cp .env.example .env.local` instead of `Copy-Item`.
Keep `.env.local` at the repository root. It is ignored by Git. Restart the dev
server after changing environment variables.

### Environment variables

| Variable | Where and why |
|---|---|
| `BALLDONTLIE_KEY` | App server: games, schedule, active rosters |
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | App server: private Blob storage for the shared API budget and highlights. For local access, add `BLOB_READ_WRITE_TOKEN` for the connected store to `.env.local`; a store ID alone is not a local credential. |
| `DIGEST_PUBLISH_TOKEN` | App server and GitHub Actions: matching secret used as a Bearer token by the highlights publisher |
| `YOUTUBE_API_KEY` | YouTube sync runner only: GitHub Actions or local `highlights:sync`. Not required by the app server. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical HTTPS origin for metadata, sitemap and robots; defaults to `VERCEL_PROJECT_PRODUCTION_URL`, then the production site |

API and publisher keys are server secrets; never prefix them with `NEXT_PUBLIC_`.
The environment template lists the core variables; add the optional values you
need. Without a BALLDONTLIE key or working Blob access, game requests cannot
refresh. News does not require an API key; rosters can fall back to ESPN.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create the production build |
| `npm start` | Serve an existing production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test` | Run the Node `*.test.mjs` suite |
| `npm run test:ssr` | Check the Morning Briefing server-rendered placeholder; requires a current build unless `BASE_URL` is supplied |
| `npm run test:e2e` | Run Playwright; configure the target as described below |
| `npm run highlights:sync` | Fetch official videos and **publish to production**; loads `.env.local` |

### API routes

| Method and route | Input / behavior |
|---|---|
| `GET /api/games` | `teamId`; last, current and next game plus record; spoiler-aware |
| `GET /api/games/live` | Today's league games; raw scores |
| `GET /api/schedule` | `teamId`, optional `start` and `end` (`YYYY-MM-DD`); raw game results, at most a 366-day range |
| `GET /api/news` | `team` or comma-separated `teams`; spoiler-aware RSS coverage |
| `GET /api/players` | `teamId`; active roster with source attribution |
| `GET /api/highlights` | `teamId` and up to 15 comma-separated recent `dates`, or `kind=top-plays`; saved video metadata |
| `GET /api/highlights?sync=1` | Bearer token required; read synchronization state |
| `POST /api/highlights` | Bearer token required; validate and merge video metadata |

Team IDs come from `src/lib/teams.ts`. API spoiler redaction applies to
`/api/games` and `/api/news`; the live and schedule endpoints expose
results. Spoiler protection is a viewing preference, not an authorization boundary.

### Spoiler API

`GET /api/news` and `GET /api/games` are closed unless the caller asks for the open payload. Every response, open or redacted, sends `Vary: x-nba-spoilers` and `Cache-Control: private, no-store`.

| Signal | Result |
|---|---|
| No `x-nba-spoilers` header, or an unknown token | Scores and spoiler headlines redacted |
| `x-nba-spoilers: none` as the only token (`None` and surrounding spaces count). Empty tokens are ignored, so `none;` is `none` | Full payload |
| `none` together with any other token, such as `none,scores` | Stays closed. `none` does not open anything unless it is alone |
| `scores` and/or `headlines` (comma or semicolon, any case, trimmed), with no `none` | Those parts stay redacted; the other part is included |
| `hideScores=1` or `hideHeadlines=true` (name and value are case-insensitive; `1` or `true`) | Forces that part to stay redacted |

`reveal=<id>` opens only that item. Every other headline, including others in the same related-coverage group, stays redacted the same way as a request without `reveal`. The id is a news link or identity, a game id, or `record`. `?team=` and `?teams=` use that same grouping and redaction. The app sends the header on every one of these calls, including `none` when spoiler protection is off.

### Shared storage

Connect a private Vercel Blob store for highlights and API quota storage.
The existing `DIGEST_PUBLISH_TOKEN` name is retained for the highlights publisher.
Digest and standings pages, APIs and publication jobs have been removed; stored
historical documents are untouched.

The **YouTube Highlights** workflow runs hourly at minute 15 (UTC schedule),
from `main`, and can also be triggered manually. Page visits never call the
YouTube Data API. See the [cache guide](docs/api-cache.md) and
[YouTube guide](docs/youtube-highlights.md) for first-run setup and recovery.

### Regression checks

The main CI workflow runs lint, typecheck, Node tests and build:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:ssr
```

Playwright needs Chromium (`npx playwright install chromium`). For local checks,
start the app in another terminal, then run:

```powershell
$env:BASE_URL = 'http://localhost:3000'
npm run test:e2e
```

`playwright.config.mjs` does not start the app. The bypass specs create their own
fixture servers; the reveal-confirmation and preview specs need `BASE_URL`.
By default, Playwright includes both top-level specs and `tests/preview/`.
For a deployed preview, set `PLAYWRIGHT_PREVIEW=1` to run only `tests/preview/`
against `BASE_URL`, and set `VERCEL_BYPASS` to the deployment protection bypass
secret. These preview helpers require it for non-local origins. The
bypass header is sent only to that origin. Same-origin redirects are followed
with the header for up to 5 hops. POST on 301, 302, or 303 becomes GET and
drops the body. A 307 or 308 keeps the method and body. A redirect to any other origin is returned
as-is, without the header.

The **Preview bypass tests** workflow runs the two bypass specs locally. The
**e2e** workflow runs after successful Vercel Preview deployments and uses the
repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` as `VERCEL_BYPASS`.
`SMOKE_ALLOW_MISSING_API_KEY` defaults to empty,
which does not tolerate any 503 console line. Set the repository variable to
`1` only when the preview has no BALLDONTLIE key or shared storage. That value
tolerates 503 only for the exact path `/api/games`.

---

## Design and Assets

- [Product context](PRODUCT.md) and [design system](DESIGN.md)
- [Brand guide and logo assets](docs/branding.md)
- [Arena image provenance](docs/arena-atmosphere.md)
- [Official team logos](public/teams/README.md)

The app includes a web manifest and install icons. Offline caching and push
notifications are not implemented.

---

## Author

**Peter Souza** — [peterleite.dev@gmail.com](mailto:peterleite.dev@gmail.com)

SDET · AI Developer · Building in public

[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?style=flat&logo=linkedin)](https://linkedin.com/in/peter-souza)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat&logo=vercel)](https://my-nba-feed.vercel.app)
