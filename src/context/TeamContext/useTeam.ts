import { useContext } from "react";
import TeamContext from "./TeamContext";

// Custom hook to use the TeamContext
export function useTeam() {
  return useContext(TeamContext);
}
