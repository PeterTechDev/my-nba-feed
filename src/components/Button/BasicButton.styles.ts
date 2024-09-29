import styled, { css } from "styled-components";

export type ButtonVariant = "primary" | "secondary";

interface ButtonContainerProps {
  variant: ButtonVariant;
}

const buttonVariants = {
  primary: {
    backgroundColor: "#0070f3",
    color: "#ffffff",
  },
  secondary: {
    backgroundColor: "#ff0080",
    color: "#ffffff",
  },
};

export const ButtonContainer = styled.button<ButtonContainerProps>`
  width: 100px;
  height: 100px;
  cursor: pointer;

  ${({ variant }) =>
    css`
      background-color: ${buttonVariants[variant].backgroundColor};
      color: ${buttonVariants[variant].color};
    `}
`;
