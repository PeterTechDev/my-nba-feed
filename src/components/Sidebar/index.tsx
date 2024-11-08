import { useEffect, useState } from "react";
import { useTeam } from "../../context/TeamContext/useTeam";
import { fetchNextGameData } from "../../services/nbaService";
import Avatar from "../Avatar/Avatar";
import { TeamSelector } from "../TeamSelector";
import {
  ConferencePosition,
  CoverImage,
  Footer,
  NextGameContainer,
  Profile,
  SidebarContainer,
  TeamName,
} from "./Sidebar.styles";
import { formatDate } from "../../utils/formatDate";

export function Sidebar() {
  const { teamData } = useTeam();
  const [nextGame, setNextGame] = useState<any | null>(null);

  useEffect(() => {
    const getNextGame = async () => {
      if (teamData?.teamInfo?.id) {
        const gameData = await fetchNextGameData(teamData.teamInfo.id);
        setNextGame(gameData);
      }
    };

    getNextGame();
  }, [teamData]);

  // Determine the opponent team
  const opponent_team = nextGame
    ? nextGame.home_team.full_name === teamData.teamInfo.full_name
      ? nextGame.visitor_team.full_name
      : nextGame.home_team.full_name
    : "";
  if (!teamData) {
    return <div>Loading team data...</div>;
  }

  return (
    <SidebarContainer>
      <CoverImage />
      <Profile>
        <Avatar src={teamData.teamInfo.teamLogo} alt={teamData.teamInfo.name} />
        <TeamName>{teamData.teamInfo.name}</TeamName>
        <ConferencePosition>
          {teamData.teamInfo.conference} Conference -{" "}
          {teamData.teamInfo.division} Division
        </ConferencePosition>
      </Profile>

      <NextGameContainer>
        <h3>Next game:</h3>
        {nextGame ? (
          <>
            <div>{formatDate(nextGame.date)}</div>
            <div>vs. {opponent_team}</div>
            <div>
              {nextGame.home_team.full_name === teamData.teamInfo.full_name
                ? nextGame.home_team_city
                : nextGame.visitor_team_city}
            </div>
          </>
        ) : (
          <div>Loading next game...</div>
        )}
      </NextGameContainer>

      <Footer>
        <TeamSelector />
      </Footer>
    </SidebarContainer>
  );
}
