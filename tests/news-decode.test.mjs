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
  const stamp = (hoursAgo) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toUTCString();
  const item = (title, source, id, hoursAgo) => `<item><title>${title}</title><source>${source}</source><link>https://news.google.com/rss/articles/${id}</link><pubDate>${stamp(hoursAgo)}</pubDate></item>`;
  const xml = `<rss>${item("<![CDATA[Celtics practice report]]>", "ESPN &amp; Wire", "cdata", 0)}${item("Celtics &amp; a quiet preview", "ESPN", "amp", 1)}${item("Celtics &#39;preview&#39;", "ESPN", "dec39", 2)}${item("Celtics &#x27;note&#x27;", "ESPN", "hex27", 3)}${item("Celtics &lt;report&gt;", "ESPN", "lt", 4)}${item("Celtics &quot;quote&quot;", "ESPN", "quot", 5)}</rss>`;
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
    { title: "Celtics 'preview'", source: "ESPN", safeTitle: "Celtics 'preview'", category: "analysis" },
    { title: "Celtics 'note'", source: "ESPN", safeTitle: "Celtics 'note'", category: "general" },
    { title: "Celtics <report>", source: "ESPN", safeTitle: "Celtics <report>", category: "analysis" },
    { title: "Celtics \"quote\"", source: "ESPN", safeTitle: "Celtics \"quote\"", category: "general" },
  ]);
});
