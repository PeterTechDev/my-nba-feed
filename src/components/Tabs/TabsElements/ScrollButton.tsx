import { ArrowLeft, ArrowRight } from "phosphor-react";
import { StyledScrollButton } from "../styles/Tabs.styles";

interface ScrollButtonProps {
  direction: "left" | "right";
  onClick: () => void;
}

export const ScrollButton = ({ direction, onClick }: ScrollButtonProps) => {
  return (
    <StyledScrollButton onClick={onClick}>
      {direction === "left" ? (
        <ArrowLeft size={24} />
      ) : (
        <ArrowRight size={24} />
      )}
    </StyledScrollButton>
  );
};
