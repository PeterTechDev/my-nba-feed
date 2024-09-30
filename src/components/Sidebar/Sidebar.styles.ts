import styled from "styled-components";

export const SidebarContainer = styled.aside`
  background: var(--gray-800);
  border-radius: 8px;
  overflow: hidden;
  width: 100%;

  /* Larger screen adjustments */
  @media (min-width: 768px) {
    max-width: 250px;
    border-right: 2px solid ${({ theme }) => theme.colors.primary};
    align-items: flex-start;
  }
`;

export const CoverImage = styled.div`
  width: 100%;
  height: 60px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

export const Profile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (min-width: 768px) {
  }
`;

export const TeamName = styled.strong`
  margin-top: 0.5rem;
  color: var(--gray-100);
  line-height: 1;
  text-align: center;
  font-size: 2rem;

  @media (min-width: 768px) {
    text-align: center;
  }
`;

export const ConferencePosition = styled.span`
  font-size: 0.875rem;
  color: var(--gray-400);
  line-height: 1.6;
  text-align: center;
  margin-top: 0.5rem;

  @media (min-width: 768px) {
  }
`;

export const NextGameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 1.2rem;

  gap: 0.5rem;
  margin: 1.5rem 0;
  color: var(--gray-100);
  font-size: 1.2rem;
  line-height: 1.6;

  @media (min-width: 768px) {
    align-items: flex-start;
    font-size: 0.875rem;
    margin: 1.2rem 0;
  }
`;

export const Footer = styled.footer`
  border-top: 1px solid var(--gray-600);
  margin-top: 1.5rem;
  padding: 1.5rem 1rem;

  @media (min-width: 768px) {
    padding: 1.5rem 2rem 2rem;
  }
`;

export const FooterLink = styled.a`
  background: transparent;
  color: var(--team-color-primary);
  border: 1px solid var(--team-color-primary);
  border-radius: 8px;
  height: 50px;
  padding: 0 1.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
  width: 100%;

  &:hover {
    background: var(--team-color-primary);
    color: var(--gray-100);
    transition: background-color 0.1s;
  }

  @media (min-width: 768px) {
    width: auto; /* Adapts width for larger screens */
  }
`;
