import { MockData } from "./types";

export const teamsData: Record<string, MockData> = {
  celtics: {
    teamInfo: {
      id: "1",
      name: "Boston Celtics",
      bannerImg:
        "https://lncimg.lance.com.br/uploads/2024/07/Jayson-Tatum-2-scaled-aspect-ratio-512-320-1.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg",
    },
    nextGame: {
      date: "2021-10-20T23:00:00.000Z",
      opponent: "New York Knicks",
      location: "Madison Square Garden",
    },
    rankings: {
      conferencePosition: 1,
      wins: 0,
      losses: 0,
    },
  },
  lakers: {
    teamInfo: {
      id: "2",
      name: "Los Angeles Lakers",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Staples_Center_Los_Angeles_Lakers.jpg/1200px-Staples_Center_Los_Angeles_Lakers.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Los_Angeles_Lakers_logo.svg/800px-Los_Angeles_Lakers_logo.svg.png",
    },
    nextGame: {
      date: "2021-10-22T23:00:00.000Z",
      opponent: "Golden State Warriors",
      location: "Chase Center",
    },
    rankings: {
      conferencePosition: 2,
      wins: 0,
      losses: 0,
    },
  },
};
