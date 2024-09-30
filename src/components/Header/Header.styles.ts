// src/components/Header/Header.styles.ts
import styled from "styled-components";

export const HeaderContainer = styled.header`
  background-color: var(--gray-800);
  color: var(--gray-100);
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative; /* Needed for dropdown positioning */
  width: 100%;

  @media (min-width: 768px) {
    padding: 1.5rem 2rem;
    justify-content: center; /* Center content for larger screens */
  }
`;

export const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 0.5rem 1rem;
  flex: 1;

  h1 {
    font-size: 1.5rem;
    text-align: center;
  }

  /* Gradient border-bottom */
  border-bottom: 4px solid transparent;
  border-image: linear-gradient(
    to right,
    ${({ theme }) => theme.colors.primary},
    ${({ theme }) => theme.colors.secondary}
  );
  border-image-slice: 1;

  @media (min-width: 768px) {
    flex: none;
    h1 {
      font-size: 2rem;
    }
  }
`;

export const Logo = styled.img`
  width: 40px;
  height: auto;
  transition: transform 0.3s;
  cursor: pointer;

  &:hover {
    transform: scale(1.2);
  }
`;

export const LinksContainer = styled.nav<{ isVisible: boolean }>`
  display: ${({ isVisible }) => (isVisible ? "flex" : "none")};
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  position: absolute;
  bottom: -90px;
  right: 0;
  background: var(--gray-800);
  padding: 1.5rem 1rem;

  a {
    text-decoration: none;
    color: var(--gray-100);
    font-weight: bold;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  @media (min-width: 768px) {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    margin-top: 0;
    position: absolute;
    right: 2rem; /* Align links to the right */

    position: absolute;
    bottom: 0;
    right: 10;
  }
`;

export const ToggleButton = styled.button`
  background: none;
  border: none;
  color: var(--gray-100);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;

  @media (min-width: 768px) {
    display: none; /* Hide toggle button on larger screens */
  }
`;
