interface TeamInfo {
  id: string;
  name: string;
  bannerImg: string;
  teamLogo: string;
  twitterHandle: string;
}

export interface NextGameProps {
  date: string;
  opponent: string;
  location: string;
}

interface Rankings {
  conferencePosition: number;
  wins: number;
  losses: number;
}

export interface MockData {
  teamInfo: TeamInfo;
  nextGame: NextGameProps;
  rankings: Rankings;
}
