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
  magic: {
    teamInfo: {
      id: "3",
      name: "Orlando Magic",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Amway_Center.jpg/1200px-Amway_Center.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/thumb/1/10/Orlando_Magic_logo.svg/800px-Orlando_Magic_logo.svg.png",
    },
    nextGame: {
      date: "2021-10-25T23:00:00.000Z",
      opponent: "Miami Heat",
      location: "Amway Center",
    },
    rankings: {
      conferencePosition: 8,
      wins: 0,
      losses: 0,
    },
  },
  warriors: {
    teamInfo: {
      id: "4",
      name: "Golden State Warriors",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Chase_Center_Warriors.jpg/1200px-Chase_Center_Warriors.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Golden_State_Warriors_logo.svg/800px-Golden_State_Warriors_logo.svg.png",
    },
    nextGame: {
      date: "2021-10-24T23:00:00.000Z",
      opponent: "Phoenix Suns",
      location: "Chase Center",
    },
    rankings: {
      conferencePosition: 3,
      wins: 0,
      losses: 0,
    },
  },
  bulls: {
    teamInfo: {
      id: "5",
      name: "Chicago Bulls",
      bannerImg:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/United_Center.jpg/1200px-United_Center.jpg",
      teamLogo:
        "https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Chicago_Bulls_logo.svg/800px-Chicago_Bulls_logo.svg.png",
    },
    nextGame: {
      date: "2021-10-26T23:00:00.000Z",
      opponent: "Milwaukee Bucks",
      location: "United Center",
    },
    rankings: {
      conferencePosition: 6,
      wins: 0,
      losses: 0,
    },
  },
};
