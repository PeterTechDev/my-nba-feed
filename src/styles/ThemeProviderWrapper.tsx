import { ThemeProvider } from "styled-components";
import { ReactNode, useState } from "react";
import { themes, ThemeNames } from "./nbaThemes";

interface ThemeProps {
  children: ReactNode;
  initialTheme: ThemeNames;
}

export function ThemeProviderWrapper({ children, initialTheme }: ThemeProps) {
  const [currentTheme] = useState(themes[initialTheme]);

  return <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>;
}
