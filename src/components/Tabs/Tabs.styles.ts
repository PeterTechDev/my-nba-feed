import styled from "styled-components";

export const TabsContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
`;

export const TabMenu = styled.ul`
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  border-bottom: 2px solid var(--gray-600);
`;

export const TabItem = styled.li<{ isActive: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-weight: bold;
  border-bottom: 4px solid
    ${({ isActive, theme }) =>
      isActive ? theme.colors.primary : "transparent"};
  color: ${({ isActive }) =>
    isActive ? "var(--gray-100)" : "var(--gray-400)"};
  transition: all 0.2s;

  &:hover {
    color: var(--gray-100);
  }
`;

export const TabContent = styled.div`
  padding: 1rem;
  color: var(--gray-100);
`;
