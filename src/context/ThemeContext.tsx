import { createContext } from "react";
import { ThemeNames } from "../styles/nbaThemes";

interface ThemeContextProps {
  changeTheme: (team: ThemeNames) => void;
}

const ThemeContext = createContext<ThemeContextProps>({} as ThemeContextProps);

export default ThemeContext;
