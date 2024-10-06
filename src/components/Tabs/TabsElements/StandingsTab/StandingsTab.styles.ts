import styled from "styled-components";

export const StyledStandingsTab = styled.div`
  padding: 1rem;
  color: var(--gray-100);

  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: var(--gray-700);
  }
`;

export const TableHeader = styled.th`
  padding: 0.75rem;
  text-align: left;
  background-color: var(--gray-600);
  color: var(--gray-100);
  font-weight: bold;
  border-bottom: 1px solid var(--gray-500);
`;
