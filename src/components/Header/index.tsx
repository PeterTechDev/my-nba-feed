// src/components/Header/index.tsx
import { useState } from "react";
import {
  HeaderContainer,
  TitleContainer,
  Logo,
  LinksContainer,
  ToggleButton,
} from "./Header.styles";
import { CaretDown } from "phosphor-react"; // Import arrow icon from phosphor-react
import NbaLogo from "../../assets/nba-logo.png";

export function Header() {
  const [isLinksVisible, setIsLinksVisible] = useState(false);

  const toggleLinks = () => {
    setIsLinksVisible((prev) => !prev);
  };

  return (
    <HeaderContainer>
      {/* Logo and title container */}
      <TitleContainer>
        <Logo src={NbaLogo} alt="NBA Logo" />
        <h1>My NBA Feed</h1>
      </TitleContainer>

      {/* Toggle button for mobile */}
      <ToggleButton onClick={toggleLinks}>
        <CaretDown size={24} />
      </ToggleButton>

      {/* Links container */}
      <LinksContainer isVisible={isLinksVisible}>
        <a href="#about">About the project</a>
        <a href="#contact">Contact</a>
      </LinksContainer>
    </HeaderContainer>
  );
}
