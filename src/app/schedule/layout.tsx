import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/schedule", { title: "Schedule" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
