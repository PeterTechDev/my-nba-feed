import styled from "styled-components";

export const StyledTop10VideosTab = styled.div`
  padding: 1rem;

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  ul {
    list-style: none;
    padding: 0;
  }
`;

export const VideoItem = styled.li`
  margin-bottom: 0.8rem;

  a {
    color: ${({ theme }) => theme.colors.secondary};
    font-size: 1rem;
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: underline;
    }
  }
`;
