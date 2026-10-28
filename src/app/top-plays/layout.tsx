import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/top-plays", {
  title: "Top Plays",
  description: "Watch the NBA's official Top 10 and Top 5 Plays of the Night, newest first.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
