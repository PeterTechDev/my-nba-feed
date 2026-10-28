/**
 * Origin used for absolute metadata URLs (Open Graph, sitemap, robots).
 * Preview deployment hosts are intentionally ignored: Vercel preview SSO
 * blocks crawlers, so shared cards must point at the public production origin.
 */
export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return asHttpsUrl(configured);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return asHttpsUrl(productionHost);

  return new URL("https://my-nba-feed.vercel.app");
}

function asHttpsUrl(value: string): URL {
  return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
}

export const siteName = "NBA Feed";

/** Copy grounded in the home feed and the About page. */
export const siteDescription =
  "Your teams, the stories around them, and the games you are saving for later. News, games, highlights, standings, schedules, rosters, fan conversations and a daily digest, with scores and result headlines hidden until you reveal them.";
