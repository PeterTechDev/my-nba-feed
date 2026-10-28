import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/digest", { title: "AI Digest" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
