import type { Metadata } from "next";

export const metadata: Metadata = { title: "Team Comparison" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
