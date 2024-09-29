import { useState, useEffect, ReactNode } from "react";
import { ThemeProvider } from "styled-components";
import ThemeContext from "./ThemeContext";
import { themes, ThemeNames } from "../styles/nbaThemes";

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme: ThemeNames;
}

export function ThemeContextProvider({
  children,
  initialTheme,
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState(themes[initialTheme]);

  const changeTheme = (team: ThemeNames) => {
    if (themes[team]) {
      setCurrentTheme(themes[team]);
    }
  };

  // Update currentTheme when initialTheme changes
  useEffect(() => {
    setCurrentTheme(themes[initialTheme]);
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{ changeTheme }}>
      <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
}
