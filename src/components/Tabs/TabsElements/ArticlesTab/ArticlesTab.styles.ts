import styled from "styled-components";

export const StyledArticlesTab = styled.div`
  padding: 1rem;
  color: var(--gray-100);

  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
`;

export const ArticleItem = styled.div`
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background-color: var(--gray-700);
  border-radius: 8px;

  h4 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 0;
    font-size: 1rem;
    color: var(--gray-300);
  }
`;
