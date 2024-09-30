import { createContext } from "react";
import { teamsData } from "../../mock-data/index";

// Define the shape of the context
interface TeamContextProps {
  selectedTeam: keyof typeof teamsData;
  changeTeam: (team: keyof typeof teamsData) => void;
  teamData: (typeof teamsData)[keyof typeof teamsData];
}

// Create the context with an initial empty value
const TeamContext = createContext<TeamContextProps>({} as TeamContextProps);

export default TeamContext;
