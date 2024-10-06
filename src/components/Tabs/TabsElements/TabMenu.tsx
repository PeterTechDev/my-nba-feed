import { forwardRef } from "react";
import { useTabs, TabNames } from "../TabsContext";
import { TabItem } from "./TabItem";
import { StyledTabMenu } from "../styles/Tabs.styles";

// Forward the ref to the `StyledTabMenu` for scroll tracking
export const TabMenu = forwardRef<HTMLUListElement>((_, ref) => {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <StyledTabMenu ref={ref}>
      {Object.values(TabNames).map((tab) => (
        <TabItem
          key={tab}
          tabName={tab}
          isActive={activeTab === tab}
          onClick={() => setActiveTab(tab)}
        />
      ))}
    </StyledTabMenu>
  );
});
