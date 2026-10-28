import { routeMetadata } from "@/lib/site";

export const metadata = routeMetadata("/highlights", { title: "Highlights" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
