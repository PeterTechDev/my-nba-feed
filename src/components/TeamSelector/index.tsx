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

export function TeamSelector() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { changeTheme } = useTheme();

  const handleTeamChange = (team: ThemeNames) => {
    changeTheme(team);
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
              <li onClick={() => handleTeamChange("celtics")}>
                Boston Celtics
              </li>
              <li onClick={() => handleTeamChange("lakers")}>
                Los Angeles Lakers
              </li>
              {/* Add more teams as needed */}
            </ul>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}
