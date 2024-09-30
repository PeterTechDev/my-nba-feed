import {
  SidebarContainer,
  CoverImage,
  Profile,
  TeamName,
  ConferencePosition,
  NextGameContainer,
  Footer,
} from "./Sidebar.styles";
import { format } from "date-fns";
import { TeamSelector } from "../TeamSelector";
import { useTeam } from "../../context/TeamContext/useTeam";
import Avatar from "../Avatar/Avatar";

export function Sidebar() {
  const { teamData } = useTeam();

  // Format the next game date
  const formattedDate = format(
    new Date(teamData.nextGame.date),
    "MMMM do, h:mm a"
  );

  return (
    <SidebarContainer>
      <CoverImage />
      <Profile>
        <Avatar src={teamData.teamInfo.teamLogo} alt={teamData.teamInfo.name} />
        <TeamName>{teamData.teamInfo.name}</TeamName>
        <ConferencePosition>
          #{teamData.rankings.conferencePosition} conference position
        </ConferencePosition>
      </Profile>

      <NextGameContainer>
        <h3>Next game:</h3>
        <div>{formattedDate}</div>
        <div>vs. {teamData.nextGame.opponent}</div>
        <div>at {teamData.nextGame.location}</div>
      </NextGameContainer>

      <Footer>
        <TeamSelector />
      </Footer>
    </SidebarContainer>
  );
}
