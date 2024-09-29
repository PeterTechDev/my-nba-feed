import { useState } from "react";
import { TeamSelectorContainer, Select } from "./TeamSelector.styles";
import { ThemeNames } from "../../styles/nbaThemes";
import { useTheme } from "../../context/useTheme";

export function TeamSelector() {
  const [selectedTeam, setSelectedTeam] = useState<ThemeNames>("celtics");
  const { changeTheme } = useTheme();

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const team = event.target.value as ThemeNames;
    setSelectedTeam(team);
    changeTheme(team);
  };

  return (
    <TeamSelectorContainer>
      <label htmlFor="team-select">Select Team:</label>
      <Select id="team-select" value={selectedTeam} onChange={handleTeamChange}>
        <option value="celtics">Celtics</option>
        <option value="lakers">Lakers</option>
        {/* Additional teams can be added here */}
      </Select>
    </TeamSelectorContainer>
  );
}
