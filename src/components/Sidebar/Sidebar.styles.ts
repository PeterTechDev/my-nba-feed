import styled from "styled-components";

export const SidebarContainer = styled.aside`
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.text};
  width: 100%;
  padding: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.primary};

  h2 {
    margin-bottom: 12px;
    font-size: 1.25rem;
  }

  p {
    margin-bottom: 8px;
    font-size: 1rem;
  }

  /* Media query for larger screens */
  @media (min-width: 768px) {
    max-width: 300px;
    border-bottom: none;
    border-right: 2px solid ${({ theme }) => theme.colors.primary};
  }
`;
