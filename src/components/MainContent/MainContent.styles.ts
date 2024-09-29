import styled from "styled-components";

export const MainContainer = styled.main`
  padding: 16px;

  section {
    margin-bottom: 24px;

    h2 {
      font-size: 1.25rem;
      margin-bottom: 12px;
    }

    p {
      font-size: 1rem;
    }
  }

  /* Media query for larger screens */
  @media (min-width: 768px) {
    padding: 24px;
  }
`;
