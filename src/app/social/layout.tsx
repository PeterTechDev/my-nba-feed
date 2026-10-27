import type { Metadata } from "next";

export const metadata: Metadata = { title: "Social Feed | NBA Feed" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
