import { useState } from "react";
import { TabsContainer, TabMenu, TabItem, TabContent } from "./Tabs.styles";

enum TabNames {
  SOCIAL = "Social Media",
  STANDINGS = "Standings",
  TOP_10 = "Top 10",
}

export function Tabs() {
  const [activeTab, setActiveTab] = useState<TabNames>(TabNames.SOCIAL);

  const renderContent = () => {
    switch (activeTab) {
      case TabNames.SOCIAL:
        return <div>Social Media feed goes here...</div>;
      case TabNames.STANDINGS:
        return <div>Standings Content goes here...</div>;
      case TabNames.TOP_10:
        return <div>Youtube Top 10 NBA</div>;
      default:
        return null;
    }
  };

  return (
    <TabsContainer>
      {/* Tab Menu */}
      <TabMenu>
        {Object.values(TabNames).map((tab) => (
          <TabItem
            key={tab}
            isActive={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </TabItem>
        ))}
      </TabMenu>

      {/* Tab Content */}
      <TabContent>{renderContent()}</TabContent>
    </TabsContainer>
  );
}
