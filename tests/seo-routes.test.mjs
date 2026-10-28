import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
// Same absolute-url rule Next uses for canonical and openGraph.url
// (root pathname with an empty query becomes the origin, no trailing slash).
const { resolveAbsoluteUrlWithPathname } = require("next/dist/lib/metadata/resolvers/resolve-url.js");

function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = {
    exports,
    require: (id) => imports[id] ?? (id.endsWith(".css") ? {} : require(id)),
    Date, URL, console,
    ...globals,
  };
  vm.runInNewContext(code, scope, { filename: file });
  return exports;
}

const isolatedProcess = { env: {} };
const site = load("lib/site.ts", { process: isolatedProcess });
const rootLayout = load("app/layout.tsx", { process: isolatedProcess }, {
  "next/font/google": { Inter: () => ({ variable: "--font-inter" }) },
  "./globals.css": {},
  "@/lib/site": site,
  "@/components/TeamThemeProvider": { default: () => null },
  "@/components/NavBar": { default: () => null },
  "@/components/Footer": { default: () => null },
  "@/components/SpoilerModeProvider": { SpoilerModeProvider: ({ children }) => children },
});
const sitemap = load("app/sitemap.ts", { process: isolatedProcess }, { "@/lib/site": site });

function HomeFeed() {
  return createElement("section", { id: "home-feed" });
}

/**
 * Public routes from sitemap.ts / PublicPath. canonical and openGraph.url are
 * the relative values routeMetadata sets; absolute is the URL Next emits from
 * metadataBase https://my-nba-feed.vercel.app. Home has no trailing slash.
 * /compare and /social are outside this table on purpose (PET-28).
 */
const publicRoutes = [
  { path: "/", module: "app/page.tsx", canonical: "/", openGraphUrl: "/", absolute: "https://my-nba-feed.vercel.app" },
  { path: "/about", module: "app/about/page.tsx", canonical: "/about", openGraphUrl: "/about", absolute: "https://my-nba-feed.vercel.app/about" },
  { path: "/digest", module: "app/digest/layout.tsx", canonical: "/digest", openGraphUrl: "/digest", absolute: "https://my-nba-feed.vercel.app/digest" },
  { path: "/highlights", module: "app/highlights/layout.tsx", canonical: "/highlights", openGraphUrl: "/highlights", absolute: "https://my-nba-feed.vercel.app/highlights" },
  { path: "/players", module: "app/players/layout.tsx", canonical: "/players", openGraphUrl: "/players", absolute: "https://my-nba-feed.vercel.app/players" },
  { path: "/schedule", module: "app/schedule/layout.tsx", canonical: "/schedule", openGraphUrl: "/schedule", absolute: "https://my-nba-feed.vercel.app/schedule" },
  { path: "/standings", module: "app/standings/layout.tsx", canonical: "/standings", openGraphUrl: "/standings", absolute: "https://my-nba-feed.vercel.app/standings" },
];

// Parent openGraph image Next already resolved from app/opengraph-image.
// The query is the content hash. On a preview the host matches twitter-image
// and is not metadataBase.
const inheritedOgImage = {
  href: "https://preview.my-nba-feed.vercel.app/opengraph-image?1ad8b1e68c4af42a",
  type: "image/png",
  alt: "NBA Feed. The result can wait. News, games, highlights and standings, with scores hidden until you reveal them.",
  width: 1200,
  height: 630,
};
const inheritedTwitterImage = "https://preview.my-nba-feed.vercel.app/twitter-image?ea726dff14259933";

const loadedRoutes = new Map(publicRoutes.map((route) => [
  route.path,
  load(route.module, { process: isolatedProcess }, {
    "@/lib/site": site,
    ...(route.module === "app/page.tsx" ? { "@/components/HomeFeed": { default: HomeFeed } } : {}),
  }),
]));

function resolvedParent() {
  return {
    openGraph: {
      images: [{
        url: new URL(inheritedOgImage.href),
        type: inheritedOgImage.type,
        alt: inheritedOgImage.alt,
        width: inheritedOgImage.width,
        height: inheritedOgImage.height,
      }],
    },
    twitter: { images: [{ url: new URL(inheritedTwitterImage) }] },
  };
}

function absoluteMetadataUrl(url, pathname) {
  assert.equal(site.getSiteUrl().origin, "https://my-nba-feed.vercel.app");
  return resolveAbsoluteUrlWithPathname(url, site.getSiteUrl(), pathname, { trailingSlash: false });
}

function imageHref(image) {
  if (typeof image === "string") return image;
  if (image && typeof image.href === "string" && image.hostname) return image.href;
  const url = image?.url;
  if (typeof url === "string") return url;
  if (url && typeof url.href === "string") return url.href;
  assert.fail(`Could not read an image URL from ${JSON.stringify(image)}`);
}

function imageHrefs(images) {
  if (!images) return [];
  return (Array.isArray(images) ? images : [images]).map(imageHref);
}

function segmentHasOwnShareImage(path) {
  if (path === "/") return false;
  return readdirSync(new URL(`../src/app${path}/`, import.meta.url))
    .some((name) => /^(opengraph-image|twitter-image)\.[a-z0-9]+$/i.test(name));
}

function assertNoTrailingSlash(value, label) {
  const authored = String(value);
  assert.equal(authored.endsWith("/") && authored !== "/", false, `${label} has a trailing slash: ${authored}`);
}

for (const route of publicRoutes) {
  test(`canonical and openGraph.url for ${route.path}`, async () => {
    const metadata = await loadedRoutes.get(route.path).generateMetadata({}, Promise.resolve(resolvedParent()));
    assertNoTrailingSlash(metadata.alternates.canonical, `${route.path} canonical`);
    assertNoTrailingSlash(metadata.openGraph.url, `${route.path} openGraph.url`);
    assert.equal(metadata.alternates.canonical, route.canonical);
    assert.equal(metadata.openGraph.url, route.openGraphUrl);
    const canonical = absoluteMetadataUrl(metadata.alternates.canonical, route.path);
    const openGraphUrl = absoluteMetadataUrl(metadata.openGraph.url, route.path);
    assert.equal(canonical, route.absolute);
    assert.equal(openGraphUrl, route.absolute);
    assert.equal(canonical.endsWith("/"), false);
    assert.equal(openGraphUrl.endsWith("/"), false);
  });

  test(`inherited og:image for ${route.path}`, async () => {
    assert.equal(segmentHasOwnShareImage(route.path), false, `${route.path} defines its own share image`);
    assert.match(readFileSync(new URL("../src/app/twitter-image.tsx", import.meta.url), "utf8"), /from\s+["']\.\/opengraph-image["']/);
    assert.match(inheritedOgImage.href, /\/opengraph-image\?[0-9a-f]{8,}$/i);
    assert.equal(new URL(inheritedOgImage.href).host, new URL(inheritedTwitterImage).host);
    assert.notEqual(new URL(inheritedOgImage.href).host, site.getSiteUrl().host);

    const metadata = await loadedRoutes.get(route.path).generateMetadata({}, Promise.resolve(resolvedParent()));
    assert.ok(Array.isArray(metadata.openGraph.images) && metadata.openGraph.images.length > 0);
    const image = metadata.openGraph.images[0];
    const href = imageHref(image);
    assert.match(href, /\/opengraph-image\?[0-9a-f]{8,}$/i, `${route.path} og:image is missing its cache hash`);
    assert.equal(href, inheritedOgImage.href, `${route.path} dropped the inherited og:image`);
    assert.equal(image.type, inheritedOgImage.type);
    assert.equal(image.alt, inheritedOgImage.alt);
    assert.equal(image.width, inheritedOgImage.width);
    assert.equal(image.height, inheritedOgImage.height);
    const ogHost = new URL(href).host;
    const twitterHrefs = [
      inheritedTwitterImage,
      ...imageHrefs(metadata.twitter?.images),
      ...imageHrefs(rootLayout.metadata?.twitter?.images),
      ...imageHrefs(rootLayout.metadata?.openGraph?.images),
    ];
    assert.ok(twitterHrefs.length > 0);
    for (const twitterHref of twitterHrefs) {
      assert.equal(new URL(twitterHref).host, ogHost, `${route.path} og:image host differs from twitter:image ${twitterHref}`);
    }
  });
}

test("home page exports metadata for / and renders HomeFeed", async () => {
  const page = loadedRoutes.get("/");
  assert.equal(typeof page.generateMetadata, "function");
  const metadata = await page.generateMetadata({}, Promise.resolve(resolvedParent()));
  assert.equal(metadata.alternates.canonical, "/");
  assert.equal(metadata.openGraph.url, "/");
  assert.equal(absoluteMetadataUrl(metadata.alternates.canonical, "/"), "https://my-nba-feed.vercel.app");
  assert.equal(renderToStaticMarkup(createElement(page.default)), '<section id="home-feed"></section>');
});

test("sitemap home loc matches the home canonical without a trailing slash", async () => {
  const home = publicRoutes[0];
  const metadata = await loadedRoutes.get("/").generateMetadata({}, Promise.resolve(resolvedParent()));
  const canonical = absoluteMetadataUrl(metadata.alternates.canonical, "/");
  const urls = Array.from(sitemap.default(), (entry) => String(entry.url));
  assert.equal(urls[0], canonical);
  assert.equal(urls[0], home.absolute);
  assert.equal(urls[0].endsWith("/"), false);
  assert.equal(canonical.endsWith("/"), false);
  assert.deepEqual(urls, publicRoutes.map((route) => route.absolute));
});

test("compare and social inherit the share image instead of replacing it", () => {
  for (const route of [
    { path: "/compare", module: "app/compare/layout.tsx" },
    { path: "/social", module: "app/social/layout.tsx" },
  ]) {
    assert.equal(segmentHasOwnShareImage(route.path), false, route.path);
    const metadata = load(route.module, { process: isolatedProcess }).metadata;
    assert.equal(imageHrefs(metadata?.openGraph?.images).length, 0, `${route.path} sets its own og:image`);
    assert.equal(imageHrefs(metadata?.twitter?.images).length, 0, `${route.path} sets its own twitter:image`);
  }
});
