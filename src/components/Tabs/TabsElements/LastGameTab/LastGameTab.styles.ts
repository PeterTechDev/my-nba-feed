import styled from "styled-components";

export const StyledLastGameTab = styled.div`
  padding: 1rem;
  color: var(--gray-100);

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }

  h4 {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    font-size: 1.3rem;
  }

  p {
    margin-bottom: 1rem;
  }
`;

export const StatsContainer = styled.div`
  margin-bottom: 1.5rem;
  background-color: var(--gray-700);
  padding: 1rem;
  border-radius: 8px;

  div {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }
`;

export const HighlightVideo = styled.li`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const VideoEmbed = styled.iframe`
  width: 100%;
  height: 300px;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  @media (min-width: 768px) {
    height: 400px; /* Increase the height on larger screens */
  }
`;
