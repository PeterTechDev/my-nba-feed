import { useState } from "react";
import {
  SelectorWrapper,
  SelectorButton,
  ModalOverlay,
  ModalContent,
} from "./TeamSelector.styles";
import { UserSwitch } from "phosphor-react";
import { ThemeNames } from "../../styles/nbaThemes";
import { useTheme } from "../../context/useTheme";
import { useTeam } from "../../context/TeamContext/useTeam";
import { teamsData } from "../../mock-data/index"; // Import the teamsData

export function TeamSelector() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { changeTheme } = useTheme();
  const { changeTeam } = useTeam();

  const handleTeamChange = (team: ThemeNames) => {
    changeTheme(team);
    changeTeam(team);
    setIsModalOpen(false); // Close modal after selection
  };

  return (
    <>
      <SelectorWrapper>
        <SelectorButton onClick={() => setIsModalOpen(true)}>
          <UserSwitch size={24} />
          Change Team
        </SelectorButton>
      </SelectorWrapper>

      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h2>Select Your Team</h2>
            <ul>
              {Object.keys(teamsData).map((teamKey) => (
                <li
                  key={teamKey}
                  onClick={() => handleTeamChange(teamKey as ThemeNames)}
                >
                  {teamsData[teamKey].teamInfo.name}
                </li>
              ))}
            </ul>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}
