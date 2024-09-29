import { SidebarContainer } from "./Sidebar.styles";
import { TeamSelector } from "../TeamSelector";

export function Sidebar() {
  return (
    <SidebarContainer>
      <h2>Team Information</h2>
      <TeamSelector />
      <p>Next game: Placeholder date</p>
    </SidebarContainer>
  );
}
