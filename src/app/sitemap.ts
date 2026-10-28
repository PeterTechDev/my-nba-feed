import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Public pages that exist under src/app. API routes are not included. */
const publicPaths = [
  "/",
  "/about",
  "/compare",
  "/digest",
  "/highlights",
  "/players",
  "/schedule",
  "/social",
  "/standings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  return publicPaths.map((path) => ({
    url: new URL(path, origin).href,
  }));
}
