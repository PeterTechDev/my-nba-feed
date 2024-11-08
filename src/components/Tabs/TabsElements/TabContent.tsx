import { useTeam } from "../../../context/TeamContext/useTeam";
import { TabNames, useTabs } from "../TabsContext";
import { StyledTabContent } from "../styles/Tabs.styles";
import { LastGameTab } from "./LastGameTab";
import { SocialMediaTab } from "./SocialMediaTab";
import { Top10VideosTab } from "./Top10VideosTab";

export const TabContent = () => {
  const { activeTab } = useTabs();
  const { teamData } = useTeam();

  const renderContent = () => {
    switch (activeTab) {
      case TabNames.SOCIAL:
        return <SocialMediaTab />;
      // case TabNames.STANDINGS:
      //   return <StandingsTab />;
      case TabNames.TOP_10:
        return <Top10VideosTab />;
      // case TabNames.ARTICLES:
      //   return <ArticlesTab />;
      case TabNames.LAST_GAME:
        return <LastGameTab teamId={teamData.teamInfo.id} />;
      default:
        return null;
    }
  };

  return <StyledTabContent>{renderContent()}</StyledTabContent>;
};
