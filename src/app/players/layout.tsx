import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/players", { title: "Players" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
