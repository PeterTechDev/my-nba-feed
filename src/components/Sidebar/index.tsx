import {
  SidebarContainer,
  CoverImage,
  Profile,
  TeamName,
  ConferencePosition,
  NextGameContainer,
  Footer,
} from "./Sidebar.styles";
import { mockData } from "../../mock-data/index";
import { format } from "date-fns";
import { TeamSelector } from "../TeamSelector";
import Avatar from "./Avatar";

export function Sidebar() {
  // Format the next game date
  const formattedDate = format(
    new Date(mockData.nextGame.date),
    "MMMM do, h:mm a"
  );

  return (
    <SidebarContainer>
      <CoverImage />
      <Profile>
        <Avatar src={mockData.teamInfo.teamLogo} alt={mockData.teamInfo.name} />
        <TeamName>{mockData.teamInfo.name}</TeamName>
        <ConferencePosition>
          #{mockData.rankings.conferencePosition} conference position
        </ConferencePosition>
      </Profile>

      <NextGameContainer>
        <h3>Next game:</h3>
        <div>{formattedDate}</div>
        <div>vs. {mockData.nextGame.opponent}</div>
        <div>at {mockData.nextGame.location}</div>
      </NextGameContainer>

      <Footer>
        <TeamSelector />
      </Footer>
    </SidebarContainer>
  );
}
