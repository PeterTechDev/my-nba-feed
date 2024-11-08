import styled from "styled-components";

export const StyledLastGameTab = styled.div`
  padding: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  background-color: var(--gray-800);
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;

  h3 {
    margin-bottom: 0.8rem;
    font-size: 1.8rem;
    color: ${({ theme }) => theme.colors.primary};
    text-align: center;
  }

  p {
    margin-bottom: 1.2rem;
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.textSecondary || "var(--gray-400)"};
    text-align: center;
  }
`;

export const VideoEmbedContainer = styled.div`
  margin-top: 2rem;
  h4 {
    margin-bottom: 0.6rem;
    font-size: 1.3rem;
    color: ${({ theme }) => theme.colors.primary};
    text-align: center;
  }

  iframe {
    width: 100%;
    height: 280px;
    border: none;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
      transform: scale(1.02);
      transition: transform 0.3s ease;
    }

    @media (min-width: 768px) {
      height: 400px;
    }
  }
`;

export const ToggleButton = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.background};
  background-color: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary};
  }
`;
