import { MockData } from "./types";

export const teamsData: Record<string, MockData> = {
  celtics: {
    teamInfo: {
      id: 2, // Celtics ID from BallDontLie API
      name: "Celtics",
      full_name: "Boston Celtics",
      city: "Boston",
      conference: "East",
      division: "Atlantic",
      abbreviation: "BOS",
      bannerImg:
        "https://lncimg.lance.com.br/uploads/2024/07/Jayson-Tatum-2-scaled-aspect-ratio-512-320-1.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg",
      twitterHandle: "celtics",
    },
  },
  lakers: {
    teamInfo: {
      id: 14, // Lakers ID from BallDontLie API
      name: "Lakers",
      full_name: "Los Angeles Lakers",
      city: "Los Angeles",
      conference: "West",
      division: "Pacific",
      abbreviation: "LAL",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Staples_Center_Los_Angeles_Lakers.jpg/1200px-Staples_Center_Los_Angeles_Lakers.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Los_Angeles_Lakers_logo.svg/800px-Los_Angeles_Lakers_logo.svg.png",
      twitterHandle: "Lakers",
    },
  },
  bulls: {
    teamInfo: {
      id: 5, // Bulls ID from BallDontLie API
      name: "Bulls",
      full_name: "Chicago Bulls",
      city: "Chicago",
      conference: "East",
      division: "Central",
      abbreviation: "CHI",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/United_Center.jpg/1200px-United_Center.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Chicago_Bulls_logo.svg/800px-Chicago_Bulls_logo.svg.png",
      twitterHandle: "chicagobulls",
    },
  },
  warriors: {
    teamInfo: {
      id: 10, // Warriors ID from BallDontLie API
      name: "Warriors",
      full_name: "Golden State Warriors",
      city: "Golden State",
      conference: "West",
      division: "Pacific",
      abbreviation: "GSW",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Chase_Center_Warriors.jpg/1200px-Chase_Center_Warriors.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Golden_State_Warriors_logo.svg/800px-Golden_State_Warriors_logo.svg.png",
      twitterHandle: "warriors",
    },
  },
  sixers: {
    teamInfo: {
      id: 23, // Sixers ID from BallDontLie API
      name: "76ers",
      full_name: "Philadelphia 76ers",
      city: "Philadelphia",
      conference: "East",
      division: "Atlantic",
      abbreviation: "PHI",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Wells_Fargo_Center.jpg/1200px-Wells_Fargo_Center.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/0/0e/Philadelphia_76ers_logo.svg",
      twitterHandle: "sixers",
    },
  },
};
