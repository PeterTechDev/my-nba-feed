import { StyledTabItem } from "../styles/Tabs.styles";

interface TabItemProps {
  tabName: string;
  isActive: boolean;
  onClick: () => void;
}

export const TabItem = ({ tabName, isActive, onClick }: TabItemProps) => {
  return (
    <StyledTabItem isActive={isActive} onClick={onClick}>
      {tabName}
    </StyledTabItem>
  );
};
