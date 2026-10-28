import type { Metadata, ResolvingMetadata } from "next";

/**
 * Origin for absolute metadata URLs (canonical, Open Graph url, sitemap, robots).
 * On a Vercel preview, Next resolves file-based og:image and twitter:image
 * against the preview host, not this origin.
 */

const fallbackSiteUrl = "https://my-nba-feed.vercel.app";

export function getSiteUrl(): URL {
  return readHttpsOrigin("NEXT_PUBLIC_SITE_URL")
    ?? readHttpsOrigin("VERCEL_PROJECT_PRODUCTION_URL", { bareHost: true })
    ?? new URL(fallbackSiteUrl);
}

/** https origin only. Bare hosts are a Vercel hostname, not a NEXT_PUBLIC_SITE_URL. */
function readHttpsOrigin(name: string, options?: { bareHost?: boolean }): URL | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const candidate = options?.bareHost && !/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? `https://${raw}` : raw;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) {
      return new URL(url.origin);
    }
  } catch {
    // new URL throws for values such as https:///. Fall through to the warning.
  }
  warnInvalidSiteUrl(name);
  return undefined;
}

const warnedSiteUrls = new Set<string>();

function warnInvalidSiteUrl(name: string) {
  if (warnedSiteUrls.has(name)) return;
  warnedSiteUrls.add(name);
  console.warn(`Ignoring ${name} because it is not a valid https URL.`);
}

export const siteName = "NBA Feed";

/** Teams, news, games and the daily digest. Scores stay hidden until reveal. */
export const siteDescription =
  "Your teams' news, games and daily digest, with scores hidden until you reveal them.";

type PublicPath = "/" | "/about" | "/digest" | "/highlights" | "/top-plays" | "/players" | "/schedule" | "/standings";

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
