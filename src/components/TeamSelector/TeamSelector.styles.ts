import styled from "styled-components";

export const TeamSelectorContainer = styled.div`
  margin-bottom: 16px;
`;

export const Select = styled.select`
  padding: 8px;
  margin-left: 8px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;
