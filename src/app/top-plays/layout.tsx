import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Plays | NBA Feed",
  description: "Watch the NBA's official Top 10 and Top 5 Plays of the Night, newest first.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
