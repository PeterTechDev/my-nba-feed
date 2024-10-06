// Social Media Mock Data
export const socialMediaPosts = [
  {
    id: 1,
    content: "LeBron hits a game-winner against the Celtics!",
    author: "NBA Official",
  },
  {
    id: 2,
    content: "Steph Curry with a 40-point performance!",
    author: "NBA Highlights",
  },
  // Add more mock posts...
];

// Standings Mock Data
export const standings = [
  { team: "Lakers", wins: 10, losses: 3 },
  { team: "Celtics", wins: 9, losses: 4 },
  // Add more mock standings...
];

// Top 10 Videos Mock Data
export const top10Videos = [
  { id: 1, title: "Top 10 Plays of the Week", url: "https://youtube.com/..." },
  { id: 2, title: "Best Dunks of the Season", url: "https://youtube.com/..." },
  // Add more videos...
];

// Articles Mock Data
export const articles = [
  {
    id: 1,
    title: "NBA Playoffs Recap",
    content: "A deep dive into the playoffs...",
  },
  {
    id: 2,
    title: "Injury Updates",
    content: "Latest updates on player injuries...",
  },
  // Add more articles...
];

// Last Game Mock Data
export const lastGame = {
  date: "October 5, 2024",
  opponent: "Denver Nuggets",
  stats: {
    teamPoints: 130,
    opponentPoints: 107,
    topScorer: {
      name: "Jaylen Brown",
      points: 34,
    },
  },
  highlights: [
    {
      id: 1,
      title: "Game Highlights",
      url: "https://www.youtube.com/watch?v=MkZo-WyHZ1c&ab_channel=HooperHighlights",
    },
  ],
};
