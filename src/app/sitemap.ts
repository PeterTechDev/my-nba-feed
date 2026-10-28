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
    url: sitemapUrl(path, origin),
  }));
}

/** Next's canonical for "/" is the origin without a trailing slash. */
function sitemapUrl(path: string, origin: URL): string {
  const url = new URL(path, origin);
  if (url.pathname === "/" && url.search === "") return url.origin;
  return url.href;
}
