import HomeFeed from "@/components/HomeFeed";
import { routeMetadata } from "@/lib/site";

export const generateMetadata = routeMetadata("/");

export default function Page() {
  return <HomeFeed />;
}
