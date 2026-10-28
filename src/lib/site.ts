import type { Metadata } from "next";

/**
 * Origin for absolute metadata URLs (canonical, Open Graph url, sitemap, robots).
 * On a Vercel preview, Next resolves file-based og:image and twitter:image
 * against the preview host, not this origin.
 */

export function getSiteUrl(): URL {
  const configured = configuredSiteUrl();
  if (configured) return configured;

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return asHttpsUrl(productionHost);

  return new URL("https://my-nba-feed.vercel.app");
}

function configuredSiteUrl(): URL | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol === "https:" && url.hostname) return url;
  } catch {
    // Invalid URL strings throw; fall through after the warning below.
  }
  console.warn("Ignoring NEXT_PUBLIC_SITE_URL because it is not a valid https URL.");
  return undefined;
}

function asHttpsUrl(value: string): URL {
  return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
}

export const siteName = "NBA Feed";

/** Teams, news, games and the daily digest. Scores stay hidden until reveal. */
export const siteDescription =
  "Your teams' news, games and daily digest, with scores hidden until you reveal them.";

type PublicPath = "/" | "/about" | "/digest" | "/highlights" | "/players" | "/schedule" | "/standings";

/**
 * Per-route canonical and Open Graph. Setting openGraph replaces the parent
 * object, so type, siteName and locale are repeated here. og:image stays on
 * the file-based opengraph-image route; og:title follows the page title.
 */
export function routeMetadata(path: PublicPath, page?: { title?: string; description?: string }): Metadata {
  const description = page?.description ?? siteDescription;
  return {
    ...(page?.title ? { title: page.title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_US",
      url: path,
      description,
      // File-based images live on the root segment. A child openGraph object
      // replaces that segment, so each route points at the same image.
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NBA Feed" }],
    },
  };
}
