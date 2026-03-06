# 🏀 NBA Feed

**Live →** [my-nba-feed.vercel.app](https://my-nba-feed.vercel.app)

---

## The Problem

Modern sports apps aren't built for fans — they're built for engagement metrics.

You open the NBA app to check one score and get hit with ads, push notification prompts, recommended content you didn't ask for, and an algorithm trying to keep you scrolling. Reddit buries the game thread under memes and hot takes. ESPN wants you to subscribe. Google shows you highlights you didn't want to see yet.

The result: checking on your team becomes a chore. You either get spoiled, get distracted, or give up and wait for someone to tell you.

## The Solution

NBA Feed cuts all of that out.

One page. Your team. The score, the record, the next game, the schedule, and what fans are actually saying — with spoiler-free mode on by default so you control when you see results. No ads. No algorithm. No recommendations. No paywall. No FOMO loop.

Just basketball, on your terms.

---

## Features

- **Live Scores** — Real-time game scores for today's matchups across the league
- **Team Dashboard** — Last game result, next game preview, and current W/L record — all in one view
- **Standings** — Full conference standings updated live
- **Schedule** — Upcoming games for any team
- **Team Compare** — Head-to-head stat comparison between any two teams (PPG, OPPG, record)
- **Social Feed** — Reddit-powered fan feed per team (r/lakers, r/bostonceltics, etc.)
- **Spoiler-Free Mode** — Hide scores until you're ready to see them. Remembered across sessions.
- **Team Selector** — Switch between all 30 NBA teams. Picks up the team's colors automatically.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data | balldontlie API + Google News RSS + Reddit JSON |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main team dashboard
│   ├── standings/            # League standings
│   ├── schedule/             # Team schedule
│   ├── compare/              # Team vs team comparison
│   ├── highlights/           # Highlights feed
│   └── api/                  # Server-side API routes
│       ├── games/            # Game data + live scores
│       ├── standings/        # Standings data
│       ├── schedule/         # Schedule data
│       ├── compare/          # Team comparison logic
│       ├── social/           # Reddit feed proxy
│       └── players/          # Player data
├── components/
│   ├── TeamHeader.tsx        # Team banner with dynamic colors
│   ├── GameSection.tsx       # Last game + next game cards
│   ├── LiveScores.tsx        # Live scoreboard ticker
│   ├── NewsFeed.tsx          # Team news feed
│   ├── TeamSelector.tsx      # Team picker (all 30 teams)
│   └── ...
├── hooks/
│   ├── useGameData.ts        # Game data fetching + polling
│   ├── useTeam.ts            # Selected team state
│   └── useSpoilerMode.ts     # Spoiler-free toggle (localStorage)
└── lib/
    ├── api.ts                # API client + TypeScript interfaces
    ├── teams.ts              # All 30 teams with IDs and colors
    ├── reddit.ts             # Reddit subreddit mappings per team
    └── nbaDate.ts            # NBA timezone-aware date helpers
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/PeterTechDev/my-nba-feed.git
cd my-nba-feed

# Install
npm install

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `BALLDONTLIE_KEY` in your environment before starting the app.

---

## Screenshots

> Dashboard showing team record, last game, next game, and Reddit social feed.

*Coming soon*

---

## Roadmap

- [ ] Push notifications for game start and final score
- [ ] Player stats page
- [ ] Playoff bracket view
- [ ] Mobile PWA support

---

## Author

**Peter Souza** — [peterleite.dev@gmail.com](mailto:peterleite.dev@gmail.com)

SDET · AI Developer · Building in public

[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?style=flat&logo=linkedin)](https://linkedin.com/in/peter-souza)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat&logo=vercel)](https://my-nba-feed.vercel.app)
