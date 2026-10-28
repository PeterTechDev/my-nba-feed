import type { Metadata, ResolvingMetadata } from "next";

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
  warnInvalidSiteUrl();
  return undefined;
}

let didWarnInvalidSiteUrl = false;

function warnInvalidSiteUrl() {
  if (didWarnInvalidSiteUrl) return;
  didWarnInvalidSiteUrl = true;
  console.warn("Ignoring NEXT_PUBLIC_SITE_URL because it is not a valid https URL.");
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
 * Per-route canonical and Open Graph. Next replaces the whole openGraph
 * object, so type, siteName and locale are set again and the file-based
 * image already resolved on the parent is copied over. That keeps its cache
 * hash, type and alt, and the same host as twitter-image. og:title follows
 * the page title.
 */
export function routeMetadata(path: PublicPath, page?: { title?: string; description?: string }) {
  return async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
    const resolved = await parent;
    const description = page?.description ?? siteDescription;
    const images = resolved.openGraph?.images;
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
        ...(images?.length ? { images } : {}),
      },
    };
  };
}
