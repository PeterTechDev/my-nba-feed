# My NBA Feed 🏀

A personalized NBA dashboard. Pick your team, see their latest game, next game, and news.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state)

## Setup

```bash
npm install
```

### API Keys

Create `.env.local`:

```
NEXT_PUBLIC_BALLDONTLIE_KEY=your_key_here
```

Get a free key at [balldontlie.io](https://www.balldontlie.io/).

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Pick any of the 30 NBA teams
- See last game result with highlights link
- See next game with countdown
- Google News RSS feed for your team
- Team colors throughout the UI
- Dark theme, mobile-first
