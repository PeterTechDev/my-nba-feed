# 🏀 NBA Feed

A personal NBA dashboard built to follow your team — live scores, standings, schedule, news, and Reddit-powered social feed. Built with Next.js 14, TypeScript, and deployed on Vercel.

**Live →** [my-nba-feed.vercel.app](https://my-nba-feed.vercel.app)

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
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data | balldontlie API + Reddit RSS |
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
│   ├── NewsFeed.tsx          # Reddit social feed
│   ├── TeamSelector.tsx      # Team picker (all 30 teams)
│   └── ...
├── hooks/
│   ├── useGameData.ts        # Game data fetching + polling
│   ├── useTeam.ts            # Selected team state
│   └── useSpoilerMode.ts     # Spoiler-free toggle (localStorage)
└── lib/
    ├── api.ts                # API client + TypeScript interfaces
    ├── teams.ts              # All 30 teams with IDs and colors
    └── reddit.ts             # Reddit subreddit mappings per team
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

No API keys required — uses public data sources.

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
