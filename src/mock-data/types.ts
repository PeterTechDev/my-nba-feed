interface TeamInfo {
  id: number;
  name: string;
  bannerImg: string;
  teamLogo: string;
  twitterHandle: string;
  full_name: string;
  city: string;
  conference: string;
  division: string;
  abbreviation: string;
}

export interface MockData {
  teamInfo: TeamInfo;
}
