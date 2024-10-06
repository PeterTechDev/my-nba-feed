import { useTabs, TabNames } from "../TabsContext";
import { StyledTabContent } from "../styles/Tabs.styles";
import { SocialMediaTab } from "./SocialMediaTab";
import { StandingsTab } from "./StandingsTab";
import { Top10VideosTab } from "./Top10VideosTab";

export const TabContent = () => {
  const { activeTab } = useTabs();

  const renderContent = () => {
    switch (activeTab) {
      case TabNames.SOCIAL:
        return <SocialMediaTab />;
      case TabNames.STANDINGS:
        return <StandingsTab />;
      case TabNames.TOP_10:
        return <Top10VideosTab />;
      // Add other cases for different tabs
      default:
        return null;
    }
  };

  return <StyledTabContent>{renderContent()}</StyledTabContent>;
};
