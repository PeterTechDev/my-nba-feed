import { useContext } from "react";
import ThemeContext from "./ThemeContext";

// Custom hook to use the ThemeContext
export function useTheme() {
  return useContext(ThemeContext);
}
