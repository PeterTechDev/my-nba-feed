import { createContext, useContext, useState, ReactNode } from "react";

// Define the possible tabs as an enum
export enum TabNames {
  SOCIAL = "Social Media",
  STANDINGS = "Standings",
  TOP_10 = "Top 10",
  ARTICLES = "Articles",
}

interface TabsContextProps {
  activeTab: TabNames;
  setActiveTab: (tab: TabNames) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

export const TabsProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<TabNames>(TabNames.SOCIAL);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabsProvider");
  }
  return context;
};
