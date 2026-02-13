"use client";
import { useEffect, ReactNode } from "react";
import { useTeam } from "@/hooks/useTeam";

export default function TeamThemeProvider({ children }: { children: ReactNode }) {
  const { selectedTeam } = useTeam();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--team-primary", selectedTeam.primaryColor);
    root.style.setProperty("--team-secondary", selectedTeam.secondaryColor);
    document.title = `${selectedTeam.name} | NBA Feed`;
  }, [selectedTeam]);

  return <>{children}</>;
}
