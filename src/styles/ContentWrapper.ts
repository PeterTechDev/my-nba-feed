import styled from "styled-components";

export const ContentWrapper = styled.div`
  width: 100%;
  margin: 2rem auto;
  padding: 0 1rem;
  display: grid;
  gap: 2rem;

  /* Mobile-first: single column */
  grid-template-columns: 1fr;

  /* Larger screen adjustments */
  @media (min-width: 768px) {
    max-width: 70rem; /* Limits the wrapper's max width */
    grid-template-columns: 256px 1fr; /* Sidebar and main content */
    align-items: flex-start;
  }
`;
