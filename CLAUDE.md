# My NBA Feed — Agent Instructions

> Personalized NBA highlights feed for Peter (Boston Celtics fan).
> Live at https://my-nba-feed.vercel.app

## Purpose
Personal NBA dashboard — today's game, last game recap, top plays, standings, news feed, and player stats. Focused on Celtics. Has a `/digest` section for the Phantom Digest autonomous loop POC.

## Stack
- **Next.js** + TypeScript
- **Tailwind CSS** + Zustand (state)
- **Lucide React** for icons
- **Vercel** deploy

## Key Routes
- `/` — Main feed (team header, game day hero, next/last game, top plays, news)
- `/highlights` — Video/play highlights
- `/schedule` — Season schedule
- `/standings` — League standings
- `/players` — Player stats
- `/social` — Social feed
- `/compare` — Player comparison tool
- `/digest` — Phantom Digest (autonomous AI digest POC)
- `app/api/` — NBA data endpoints (scores, news, standings, players)

## Key Files
- `src/components/TeamHeader.tsx` — Celtics branding header
- `src/components/GameDayHero.tsx` — Today's game featured card
- `src/components/GameSection.tsx` — Last/next game cards
- `src/components/GameDataProvider.tsx` — Data fetching wrapper
- `src/components/NewsFeed.tsx` — NBA news list

## Phantom Digest POC
The `/digest` route is the testbed for Peter's autonomous loop concept:
- Agent generates a daily NBA digest → stores it → sends Telegram preview
- Telegram reactions (🔥/👎) feed back into style weight adjustments
- Config: `digest-config.json` (style weights)
- Archive view at `/digest/archive`

This is **the priority feature** — Phantom Digest autonomous loop POC.

## Run
```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy
Vercel — push to main triggers deploy.

## Notes
- Peter is a Celtics/LeBron James fan — Celtics is the primary team context
- Keep the UI clean and fast — this is a personal dashboard, not a commercial product
- The `/digest` section is the active development area (Phantom Digest POC)
