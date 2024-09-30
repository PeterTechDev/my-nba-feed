import styled, { css } from "styled-components";

export const StyledAvatar = styled.img<{ rounded?: boolean }>`
  width: calc(5rem + 12px);
  height: calc(5rem + 12px);
  border-radius: 8px; /* Default square shape */
  border: 4px solid var(--gray-800);
  outline: 2px solid ${({ theme }) => theme.colors.primary};
  display: block;
  margin-top: calc(0px - 1.5rem - 6px);

  /* If rounded prop is true, make the avatar a circle */
  ${({ rounded }) =>
    rounded &&
    css`
      border-radius: 50%;
    `}
`;
