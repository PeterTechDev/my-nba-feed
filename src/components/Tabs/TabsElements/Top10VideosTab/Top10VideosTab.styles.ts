import styled from "styled-components";

export const StyledTop10VideosTab = styled.div`
  padding: 1rem;
  color: var(--gray-100);

  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }
`;

export const VideoItem = styled.li`
  margin-bottom: 1rem;

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    font-size: 1.1rem;
  }

  a:hover {
    text-decoration: underline;
  }
`;
