import { HeaderContainer, TitleContainer, Logo } from "./Header.styles";
import NbaLogo from "../../assets/nba-logo.png";

export function Header() {
  return (
    <HeaderContainer>
      <TitleContainer>
        <Logo src={NbaLogo} alt="NBA Logo" />
        <h1>My NBA Feed</h1>
      </TitleContainer>
    </HeaderContainer>
  );
}
