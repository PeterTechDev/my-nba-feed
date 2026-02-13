export interface Team {
  id: number; // BallDontLie API ID
  nbaComId: number; // NBA.com ID (for logos)
  name: string;
  abbreviation: string;
  city: string;
  conference: "East" | "West";
  division: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
}

function t(
  id: number, nbaComId: number, name: string, abbreviation: string, city: string,
  conference: "East" | "West", division: string, primaryColor: string, secondaryColor: string
): Team {
  return {
    id, nbaComId, name, abbreviation, city, conference, division,
    primaryColor, secondaryColor,
    logo: `https://cdn.nba.com/logos/nba/${nbaComId}/primary/L/logo.svg`,
  };
}

export const teams: Team[] = [
  // East — Atlantic
  t(2, 1610612738, "Celtics", "BOS", "Boston", "East", "Atlantic", "#007A33", "#BA9653"),
  t(3, 1610612751, "Nets", "BKN", "Brooklyn", "East", "Atlantic", "#000000", "#FFFFFF"),
  t(20, 1610612752, "Knicks", "NYK", "New York", "East", "Atlantic", "#006BB6", "#F58426"),
  t(23, 1610612755, "76ers", "PHI", "Philadelphia", "East", "Atlantic", "#006BB6", "#ED174C"),
  t(28, 1610612761, "Raptors", "TOR", "Toronto", "East", "Atlantic", "#CE1141", "#000000"),
  // East — Central
  t(5, 1610612741, "Bulls", "CHI", "Chicago", "East", "Central", "#CE1141", "#000000"),
  t(6, 1610612739, "Cavaliers", "CLE", "Cleveland", "East", "Central", "#860038", "#FDBB30"),
  t(9, 1610612765, "Pistons", "DET", "Detroit", "East", "Central", "#C8102E", "#1D42BA"),
  t(13, 1610612754, "Pacers", "IND", "Indiana", "East", "Central", "#002D62", "#FDBB30"),
  t(17, 1610612749, "Bucks", "MIL", "Milwaukee", "East", "Central", "#00471B", "#EEE1C6"),
  // East — Southeast
  t(1, 1610612737, "Hawks", "ATL", "Atlanta", "East", "Southeast", "#E03A3E", "#C1D32F"),
  t(4, 1610612766, "Hornets", "CHA", "Charlotte", "East", "Southeast", "#1D1160", "#00788C"),
  t(15, 1610612748, "Heat", "MIA", "Miami", "East", "Southeast", "#98002E", "#F9A01B"),
  t(22, 1610612753, "Magic", "ORL", "Orlando", "East", "Southeast", "#0077C0", "#C4CED4"),
  t(30, 1610612764, "Wizards", "WAS", "Washington", "East", "Southeast", "#002B5C", "#E31837"),
  // West — Northwest
  t(8, 1610612743, "Nuggets", "DEN", "Denver", "West", "Northwest", "#0E2240", "#FEC524"),
  t(18, 1610612750, "Timberwolves", "MIN", "Minnesota", "West", "Northwest", "#0C2340", "#236192"),
  t(21, 1610612760, "Thunder", "OKC", "Oklahoma City", "West", "Northwest", "#007AC1", "#EF6100"),
  t(24, 1610612757, "Trail Blazers", "POR", "Portland", "West", "Northwest", "#E03A3E", "#000000"),
  t(29, 1610612762, "Jazz", "UTA", "Utah", "West", "Northwest", "#002B5C", "#00471B"),
  // West — Pacific
  t(10, 1610612744, "Warriors", "GSW", "Golden State", "West", "Pacific", "#1D428A", "#FFC72C"),
  t(12, 1610612746, "Clippers", "LAC", "Los Angeles", "West", "Pacific", "#C8102E", "#1D428A"),
  t(14, 1610612747, "Lakers", "LAL", "Los Angeles", "West", "Pacific", "#552583", "#FDB927"),
  t(25, 1610612756, "Suns", "PHX", "Phoenix", "West", "Pacific", "#1D1160", "#E56020"),
  t(27, 1610612758, "Kings", "SAC", "Sacramento", "West", "Pacific", "#5A2D81", "#63727A"),
  // West — Southwest
  t(7, 1610612742, "Mavericks", "DAL", "Dallas", "West", "Southwest", "#00538C", "#002B5E"),
  t(11, 1610612745, "Rockets", "HOU", "Houston", "West", "Southwest", "#CE1141", "#000000"),
  t(16, 1610612763, "Grizzlies", "MEM", "Memphis", "West", "Southwest", "#5D76A9", "#12173F"),
  t(19, 1610612740, "Pelicans", "NOP", "New Orleans", "West", "Southwest", "#0C2340", "#C8102E"),
  t(26, 1610612759, "Spurs", "SAS", "San Antonio", "West", "Southwest", "#C4CED4", "#000000"),
];

export const getTeamById = (id: number) => teams.find((t) => t.id === id);
export const getCeltics = () => teams.find((t) => t.abbreviation === "BOS")!;
