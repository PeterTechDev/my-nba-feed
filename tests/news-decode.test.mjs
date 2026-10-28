import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (id) => imports[id] ?? require(id),
    Date, URL, AbortSignal, Response, Buffer, setTimeout,
    ...globals,
  });
  return exports;
}

const api = load("lib/api.ts");
const teams = load("lib/teams.ts");
const news = load("lib/news.ts", {}, { "./api": api, "./teams": teams });
const imports = {
  "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
  "@/lib/api": api,
  "@/lib/teams": teams,
  "@/lib/news": news,
  "@/lib/communityFeed": load("lib/communityFeed.ts"),
};

test("news route decodes CDATA titles and amp entities", async () => {
  const newer = new Date().toUTCString();
  const older = new Date(Date.now() - 60 * 60 * 1000).toUTCString();
  const xml = `<rss><item><title><![CDATA[Celtics practice report]]></title><source>ESPN &amp; Wire</source><link>https://news.google.com/rss/articles/cdata</link><pubDate>${newer}</pubDate></item><item><title>Celtics &amp; a quiet preview</title><source>ESPN</source><link>https://news.google.com/rss/articles/amp</link><pubDate>${older}</pubDate></item></rss>`;
  const route = load("app/api/news/route.ts", {
    fetch: async () => ({ ok: true, text: async () => xml }),
  }, imports);
  const result = await route.GET({ nextUrl: new URL("http://localhost/api/news?team=Celtics") });
  assert.equal(result.status, 200);
  const items = Array.from(result.body, (item) => ({
    title: `${item.title}`,
    source: `${item.source}`,
    safeTitle: `${item.safeTitle}`,
    category: `${item.category}`,
  }));
  assert.deepEqual(items, [
    { title: "Celtics practice report", source: "ESPN & Wire", safeTitle: "Celtics practice report", category: "analysis" },
    { title: "Celtics & a quiet preview", source: "ESPN", safeTitle: "Celtics & a quiet preview", category: "analysis" },
  ]);
});
