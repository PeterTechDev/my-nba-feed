import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Public pages under src/app. /api is excluded.
 * /compare and /social are omitted on purpose: PET-28 (#3) removes those routes.
 */
const publicPaths = [
  "/",
  "/about",
  "/digest",
  "/highlights",
  "/players",
  "/schedule",
  "/standings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  return publicPaths.map((path) => ({
    url: new URL(path, origin).href,
  }));
}
