import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/highlights", { title: "Highlights" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
