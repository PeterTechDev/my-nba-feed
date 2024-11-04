import styled from "styled-components";

export const StyledLastGameTab = styled.div`
  padding: 1rem;
  color: var(--gray-100);

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--gray-300);
  }
`;

export const StatsContainer = styled.div`
  background-color: var(--gray-700);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;

  div {
    font-size: 1rem;
    color: var(--gray-100);
  }
`;

export const VideoEmbedContainer = styled.div`
  margin-top: 2rem;
  h4 {
    margin-bottom: 0.5rem;
    font-size: 1.3rem;
    color: ${({ theme }) => theme.colors.primary};
  }

  iframe {
    width: 100%;
    height: 300px;
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

    @media (min-width: 768px) {
      height: 400px;
    }
  }
`;
