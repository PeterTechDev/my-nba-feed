import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const srcRoot = fileURLToPath(new URL("../src/", import.meta.url));

// Next does not export its metadata URL resolver. For an origin metadataBase,
// `new URL` plus "pathname / and empty query → origin" matches that resolver:
// the home canonical has no trailing slash, and a base href of
// https://host/ does not produce a double slash.
function absoluteUrl(metadataBase, path) {
  const url = new URL(path, metadataBase);
  if (url.pathname === "/" && url.search === "" && url.hash === "") return url.origin;
  return url.href;
}

function metadataBaseFrom(layout) {
  const base = layout.metadata?.metadataBase;
  assert.ok(base, "app/layout.tsx must export metadata.metadataBase");
  return new URL(typeof base === "string" ? base : base.href);
}

function load(file, imports = {}, env = {}, hooks = {}) {
  const source = readFileSync(join(srcRoot, file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => imports[id] ?? (id.endsWith(".css") ? {} : require(id)),
    Date, URL,
    console: hooks.console ?? console,
    process: { env: { ...env } },
  }, { filename: `${file}?${JSON.stringify(env)}` });
  return exports;
}

const layoutImports = {
  "next/font/google": { Inter: () => ({ variable: "--font-inter" }) },
  "./globals.css": {},
  "@/components/TeamThemeProvider": { default: () => null },
  "@/components/NavBar": { default: () => null },
  "@/components/Footer": { default: () => null },
  "@/components/SpoilerModeProvider": { SpoilerModeProvider: ({ children }) => children },
};

function HomeFeed() {
  return createElement("section", { id: "home-feed" });
}

function loadGraph(env, hooks = {}) {
  const site = load("lib/site.ts", {}, env, hooks);
  const layout = load("app/layout.tsx", { ...layoutImports, "@/lib/site": site }, env, hooks);
  const sitemap = load("app/sitemap.ts", { "@/lib/site": site }, env, hooks);
  const robots = load("app/robots.ts", { "@/lib/site": site }, env, hooks);
  return { site, layout, sitemap, robots };
}

function srcFile(file) {
  return join(srcRoot, file);
}

function sitemapPaths(entries) {
  return Array.from(entries, (entry) => {
    const pathname = new URL(`${entry.url}`).pathname.replace(/\/$/, "");
    return pathname || "/";
  });
}

function hasPage(routePath) {
  const file = routePath === "/" ? "app/page.tsx" : `app${routePath}/page.tsx`;
  return existsSync(srcFile(file));
}

function metadataFile(routePath) {
  const candidates = routePath === "/"
    ? ["app/page.tsx"]
    : [`app${routePath}/layout.tsx`, `app${routePath}/page.tsx`];
  const existing = candidates.filter((file) => existsSync(srcFile(file)));
  assert.ok(existing.length > 0, `${routePath} is in the sitemap but has no page`);
  return existing.find((file) => readFileSync(srcFile(file), "utf8").includes("routeMetadata")) ?? existing[0];
}

function discoverPublicPages() {
  const pages = [];
  function walk(dir, routePath) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "page.tsx")) pages.push(routePath);
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "api" || entry.name.startsWith("(")) continue;
      const child = routePath === "/" ? `/${entry.name}` : `${routePath}/${entry.name}`;
      walk(join(dir, entry.name), child);
    }
  }
  walk(srcFile("app"), "/");
  return pages;
}

function segmentHasOwnShareImage(routePath) {
  if (routePath === "/") return false;
  const dir = srcFile(`app${routePath}`);
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((name) => /^(opengraph-image|twitter-image)\.[a-z0-9]+$/i.test(name));
}

// Already-resolved file image handed to the route as parent metadata.
// routeMetadata replaces openGraph, so the copy has to keep this content hash
// and the same host as the parent's twitter:image. Preview deployment hosts
// are covered by the env tests; they do not replace metadataBase.
const inheritedOgImage = {
  href: "https://preview.my-nba-feed.vercel.app/opengraph-image?1ad8b1e68c4af42a",
  type: "image/png",
  alt: "NBA Feed. The result can wait. News, games, highlights and standings, with scores hidden until you reveal them.",
  width: 1200,
  height: 630,
};
const inheritedTwitterImage = "https://preview.my-nba-feed.vercel.app/twitter-image?ea726dff14259933";

const defaultEnv = {};
const graph = loadGraph(defaultEnv);
const publicPaths = sitemapPaths(graph.sitemap.default());

function routeModule(routePath) {
  const file = metadataFile(routePath);
  const imports = { "@/lib/site": graph.site };
  if (file === "app/page.tsx") imports["@/components/HomeFeed"] = { default: HomeFeed };
  return load(file, imports, defaultEnv);
}

const loadedRoutes = new Map(publicPaths.map((routePath) => [routePath, routeModule(routePath)]));

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

function assertNoTrailingSlash(value, label) {
  const authored = String(value);
  assert.equal(authored.endsWith("/") && authored !== "/", false, `${label} has a trailing slash: ${authored}`);
}

function assertNoDoubleSlash(absolute) {
  assert.equal(new URL(absolute).pathname.includes("//"), false, absolute);
}

function disallowValues(rules) {
  return (Array.isArray(rules) ? rules : [rules]).flatMap((rule) => {
    const value = rule?.disallow;
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });
}

for (const routePath of publicPaths) {
  test(`canonical and openGraph.url for ${routePath}`, async () => {
    const base = metadataBaseFrom(graph.layout);
    const metadata = await loadedRoutes.get(routePath).generateMetadata({}, Promise.resolve(resolvedParent()));
    assertNoTrailingSlash(metadata.alternates.canonical, `${routePath} canonical`);
    assertNoTrailingSlash(metadata.openGraph.url, `${routePath} openGraph.url`);
    assert.equal(metadata.alternates.canonical, routePath);
    assert.equal(metadata.openGraph.url, routePath);
    assert.equal(absoluteUrl(base, metadata.alternates.canonical), graph.sitemap.default()[publicPaths.indexOf(routePath)].url);
  });

  test(`inherited og:image for ${routePath}`, async () => {
    assert.equal(hasPage(routePath), true, `${routePath} is in the sitemap but has no page`);
    assert.equal(segmentHasOwnShareImage(routePath), false, `${routePath} defines its own share image`);
    const metadata = await loadedRoutes.get(routePath).generateMetadata({}, Promise.resolve(resolvedParent()));
    assert.ok(Array.isArray(metadata.openGraph.images) && metadata.openGraph.images.length > 0);
    const image = metadata.openGraph.images[0];
    const href = imageHref(image);
    assert.match(href, /\/opengraph-image\?[0-9a-f]{8,}$/i, `${routePath} og:image is missing its cache hash`);
    assert.equal(href, inheritedOgImage.href, `${routePath} dropped the inherited og:image`);
    assert.equal(image.type, inheritedOgImage.type);
    assert.equal(image.alt, inheritedOgImage.alt);
    assert.equal(image.width, inheritedOgImage.width);
    assert.equal(image.height, inheritedOgImage.height);
    for (const extra of [
      ...imageHrefs(metadata.twitter?.images),
      ...imageHrefs(graph.layout.metadata?.twitter?.images),
      ...imageHrefs(graph.layout.metadata?.openGraph?.images),
    ]) {
      assert.equal(new URL(extra).host, new URL(href).host, `${routePath} image host differs: ${extra}`);
    }
  });
}

test("home page exports metadata for / and renders HomeFeed", async () => {
  const page = loadedRoutes.get("/");
  assert.equal(typeof page.generateMetadata, "function");
  const metadata = await page.generateMetadata({}, Promise.resolve(resolvedParent()));
  metadataBaseFrom(graph.layout);
  assert.equal(metadata.alternates.canonical, "/");
  assert.equal(metadata.openGraph.url, "/");
  assert.equal(renderToStaticMarkup(createElement(page.default)), '<section id="home-feed"></section>');
});

test("sitemap home loc matches the home canonical without a trailing slash", async () => {
  const base = metadataBaseFrom(graph.layout);
  const metadata = await loadedRoutes.get("/").generateMetadata({}, Promise.resolve(resolvedParent()));
  const canonical = absoluteUrl(base, metadata.alternates.canonical);
  const urls = Array.from(graph.sitemap.default(), (entry) => String(entry.url));
  assert.equal(urls[0].endsWith("/"), false);
  assert.equal(urls[0], canonical);
  assert.equal(urls[0], base.origin);
  assert.deepEqual(urls, publicPaths.map((routePath) => absoluteUrl(base, routePath)));
  for (const url of urls) assertNoDoubleSlash(url);
});

test("sitemap routes have pages, and other public pages are the intentional omissions", () => {
  for (const routePath of publicPaths) {
    assert.equal(hasPage(routePath), true, `${routePath} is in the sitemap but has no page`);
  }
  const outside = discoverPublicPages().filter((routePath) => !publicPaths.includes(routePath)).sort();
  // PET-28 removes these. Absent directories are not read, so the removal does not throw.
  const intentional = ["/compare", "/social"].filter((routePath) => hasPage(routePath)).sort();
  assert.deepEqual(outside, intentional);
  for (const routePath of outside) {
    assert.equal(segmentHasOwnShareImage(routePath), false, routePath);
    const layoutFile = `app${routePath}/layout.tsx`;
    if (!existsSync(srcFile(layoutFile))) continue;
    const metadata = load(layoutFile, {}, defaultEnv).metadata;
    assert.equal(imageHrefs(metadata?.openGraph?.images).length, 0, `${routePath} sets its own og:image`);
    assert.equal(imageHrefs(metadata?.twitter?.images).length, 0, `${routePath} sets its own twitter:image`);
  }
});

test("robots disallows /api/ and advertises the metadataBase sitemap", () => {
  const origin = metadataBaseFrom(graph.layout).origin;
  const robots = graph.robots.default();
  assert.ok(disallowValues(robots.rules).includes("/api/"));
  assert.equal(robots.sitemap, `${origin}/sitemap.xml`);
  assertNoDoubleSlash(robots.sitemap);
});

function assertOrigin(env, origin) {
  const loaded = loadGraph(env);
  const base = metadataBaseFrom(loaded.layout);
  assert.equal(base.origin, origin);
  assertNoDoubleSlash(base.href);
  const urls = Array.from(loaded.sitemap.default(), (entry) => String(entry.url));
  assert.equal(urls[0], origin);
  assert.equal(urls[0].endsWith("/"), false);
  assert.deepEqual(urls, sitemapPaths(loaded.sitemap.default()).map((routePath) => absoluteUrl(base, routePath)));
  for (const url of urls) assertNoDoubleSlash(url);
  const robots = loaded.robots.default();
  assert.ok(disallowValues(robots.rules).includes("/api/"));
  assert.equal(robots.sitemap, `${origin}/sitemap.xml`);
}

test("preview canonical stays on metadataBase when branch and deployment URLs are set", () => {
  assertOrigin({
    VERCEL_ENV: "preview",
    VERCEL_BRANCH_URL: "my-nba-feed-git-feat-pet-21-seo-og.vercel.app",
    VERCEL_URL: "my-nba-feed-abc123.vercel.app",
  }, "https://my-nba-feed.vercel.app");
});

test("VERCEL_URL alone does not replace metadataBase", () => {
  assertOrigin({ VERCEL_URL: "my-nba-feed-abc123.vercel.app" }, "https://my-nba-feed.vercel.app");
});

test("VERCEL_URL and VERCEL_BRANCH_URL do not replace metadataBase", () => {
  assertOrigin({
    VERCEL_BRANCH_URL: "my-nba-feed-git-branch.vercel.app",
    VERCEL_URL: "my-nba-feed-abc123.vercel.app",
  }, "https://my-nba-feed.vercel.app");
});

const fallbackOrigin = "https://my-nba-feed.vercel.app";
const ignoredSiteUrlWarning = "Ignoring NEXT_PUBLIC_SITE_URL because it is not a valid https URL.";

function assertConfiguredSite(value, origin, { rejected = false } = {}) {
  const warnings = [];
  const loaded = loadGraph({ NEXT_PUBLIC_SITE_URL: value }, {
    console: { ...console, warn(...args) { warnings.push(args.map((part) => String(part)).join(" ")); } },
  });
  const base = metadataBaseFrom(loaded.layout);
  assert.equal(base.origin, origin);
  assert.equal(base.pathname, "/", `metadataBase kept a non-origin path: ${base.pathname}`);
  assert.equal(base.search, "");
  assert.equal(base.hash, "");
  assert.equal(base.username, "");
  assert.equal(base.password, "");
  assert.equal(base.href, `${origin}/`);
  assert.equal(base.href.includes("@"), false);
  assertNoDoubleSlash(base.href);
  const urls = Array.from(loaded.sitemap.default(), (entry) => `${entry.url}`);
  const paths = sitemapPaths(loaded.sitemap.default());
  assert.equal(urls[0], origin);
  assert.equal(urls[0].endsWith("/"), false);
  assert.equal(urls[0], absoluteUrl(base, "/"));
  assert.deepEqual(urls, paths.map((routePath) => routePath === "/" ? origin : `${origin}${routePath}`));
  for (const url of urls) assertNoDoubleSlash(url);
  const robots = loaded.robots.default();
  assert.ok(disallowValues(robots.rules).includes("/api/"));
  assert.equal(`${robots.sitemap}`, `${origin}/sitemap.xml`);
  assertNoDoubleSlash(robots.sitemap);
  if (rejected) {
    assert.deepEqual(warnings, [ignoredSiteUrlWarning]);
    assert.equal(warnings.some((warning) => warning.includes("pw") || warning.includes("user:pw") || warning.includes("@")), false);
  } else {
    assert.deepEqual(warnings, []);
  }
}

// A single trailing slash is collapsed by the URL parser, so it does not
// separate the pre-112874a parser from later code. Double slashes, a path,
// a query, and a hash do: getSiteUrl keeps only url.origin.
const configuredOriginCases = [
  ["https://x.example/", "https://x.example"],
  ["https://x.example//", "https://x.example"],
  ["https://x.example///", "https://x.example"],
  ["https://x.example/base", "https://x.example"],
  ["https://x.example/base/", "https://x.example"],
  ["https://x.example/base//", "https://x.example"],
  ["https://x.example/?q=1", "https://x.example"],
  ["https://x.example/?q=1/", "https://x.example"],
  ["https://x.example/#top/", "https://x.example"],
  ["  https://x.example/base/  ", "https://x.example"],
];

for (const [value, origin] of configuredOriginCases) {
  test(`NEXT_PUBLIC_SITE_URL ${JSON.stringify(value)} is only ${origin}`, () => {
    assertConfiguredSite(value, origin);
  });
}

for (const value of [
  "http://x.example",
  "http://x.example/base",
  "https://user@x.example",
  "https://:pw@x.example",
  "https://user:pw@x.example/base/",
]) {
  test(`NEXT_PUBLIC_SITE_URL ${JSON.stringify(value)} falls back to the production origin`, () => {
    assertConfiguredSite(value, fallbackOrigin, { rejected: true });
  });
}

function assertProductionHost(value, origin, { rejected = false } = {}) {
  const warnings = [];
  let loaded;
  try {
    loaded = loadGraph({ VERCEL_PROJECT_PRODUCTION_URL: value }, {
      console: { ...console, warn(...args) { warnings.push(args.map((part) => String(part)).join(" ")); } },
    });
  } catch (error) {
    assert.fail(`VERCEL_PROJECT_PRODUCTION_URL ${JSON.stringify(value)} threw ${error.name}: ${error.message}`);
  }
  const base = metadataBaseFrom(loaded.layout);
  assert.equal(base.protocol, "https:");
  assert.equal(base.origin, origin);
  assert.equal(base.pathname, "/", `production metadataBase kept a path: ${base.pathname}`);
  assert.equal(base.search, "");
  assert.equal(base.hash, "");
  assert.equal(base.href, `${origin}/`);
  assertNoDoubleSlash(base.href);
  const urls = Array.from(loaded.sitemap.default(), (entry) => `${entry.url}`);
  const paths = sitemapPaths(loaded.sitemap.default());
  assert.equal(urls[0], origin);
  assert.equal(urls[0].endsWith("/"), false);
  assert.deepEqual(urls, paths.map((routePath) => routePath === "/" ? origin : `${origin}${routePath}`));
  for (const url of urls) assertNoDoubleSlash(url);
  const robots = loaded.robots.default();
  assert.equal(`${robots.sitemap}`, `${origin}/sitemap.xml`);
  assertNoDoubleSlash(robots.sitemap);
  if (rejected) {
    assert.deepEqual(warnings, ["Ignoring VERCEL_PROJECT_PRODUCTION_URL because it is not a valid https URL."]);
    assert.equal(warnings.some((warning) => warning.includes(value)), false);
  } else {
    assert.deepEqual(warnings, []);
  }
}

test("VERCEL_PROJECT_PRODUCTION_URL host becomes https://host", () => {
  assertProductionHost("prod.example", "https://prod.example");
});

test("VERCEL_PROJECT_PRODUCTION_URL with a path keeps only the origin", () => {
  assertProductionHost("prod.example/base", "https://prod.example");
});

test("VERCEL_PROJECT_PRODUCTION_URL http://host falls back without throwing", () => {
  assertProductionHost("http://prod.example", fallbackOrigin, { rejected: true });
});

test("VERCEL_PROJECT_PRODUCTION_URL https:/// falls back without throwing", () => {
  assertProductionHost("https:///", fallbackOrigin, { rejected: true });
});
