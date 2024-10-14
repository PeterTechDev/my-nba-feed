import { ReactNode, useState } from "react";
import TeamContext from "./TeamContext";
import { teamsData } from "../../mock-data/index";

interface TeamProviderProps {
  children: ReactNode;
  initialTeam: keyof typeof teamsData;
}

export function TeamProvider({ children, initialTeam }: TeamProviderProps) {
  const [selectedTeam, setSelectedTeam] =
    useState<keyof typeof teamsData>(initialTeam);

  const changeTeam = (team: keyof typeof teamsData) => {
    setSelectedTeam(team);
  };

  // Retrieve data for the currently selected team
  const teamData = teamsData[selectedTeam];

  const teamTwitterHandle = teamData.teamInfo.twitterHandle;

  return (
    <TeamContext.Provider
      value={{ selectedTeam, changeTeam, teamData, teamTwitterHandle }}
    >
      {children}
    </TeamContext.Provider>
  );
}
