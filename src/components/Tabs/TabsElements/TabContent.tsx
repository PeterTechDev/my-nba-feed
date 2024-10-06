import { useTabs, TabNames } from "../TabsContext";
import { StyledTabContent } from "../styles/Tabs.styles";
import { SocialMediaTab } from "./SocialMediaTab";
import { StandingsTab } from "./StandingsTab";
import { Top10VideosTab } from "./Top10VideosTab";
import { ArticlesTab } from "./ArticlesTab";

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
      case TabNames.ARTICLES:
        return <ArticlesTab />;
      default:
        return null;
    }
  };

  return <StyledTabContent>{renderContent()}</StyledTabContent>;
};
