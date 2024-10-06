import { StyledTabContent } from "../styles/Tabs.styles";
import { useTabs, TabNames } from "../TabsContext";

export const TabContent = () => {
  const { activeTab } = useTabs();

  const renderContent = () => {
    switch (activeTab) {
      case TabNames.SOCIAL:
        return <div>Social Media feed goes here...</div>;
      case TabNames.STANDINGS:
        return <div>Standings Content goes here...</div>;
      case TabNames.TOP_10:
        return <div>Youtube Top 10 NBA</div>;
      case TabNames.ARTICLES:
        return <div>Articles Content goes here...</div>;
      default:
        return null;
    }
  };

  return <StyledTabContent>{renderContent()}</StyledTabContent>;
};
