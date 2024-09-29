import { ButtonContainer, ButtonVariant } from "./BasicButton.styles";

interface ButtonProps {
  variant?: ButtonVariant;
}

export function BasicButton({ variant = "secondary" }: ButtonProps) {
  return <ButtonContainer variant={variant}>Click me!</ButtonContainer>;
}
