import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/standings", { title: "Standings" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
