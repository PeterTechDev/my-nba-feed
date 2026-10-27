import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import nextEnv from "@next/env";
import { del, head, BlobNotFoundError } from "@vercel/blob";

const require = createRequire(import.meta.url);
function load(file, imports = {}, globals = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => imports[id] ?? require(id),
    process, Response, Buffer, URL, Date, ...globals });
  return exports;
}

// Uses the real handlers and Blob SDK; only document names and publisher credentials are isolated.
export async function testDigestWrites(page) {
  nextEnv.loadEnvConfig(fileURLToPath(new URL("..", import.meta.url)), true);
  assert.ok(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN, "Pull development Blob credentials first");
  const prefix = `write-checks/${randomUUID()}/`;
  const names = ["digests.json", "digest-feedback.json"];
  const storage = load("lib/digestStorage.ts");
  const scoped = Object.fromEntries(["readDigestDocument", "updateDigestDocument"].map((method) => [method,
    (name, ...args) => { assert.ok(names.includes(name)); return storage[method](prefix + name, ...args); },
  ]));
  const token = randomUUID();
  const imports = { "@/lib/digestStorage": scoped, "@/lib/digest": load("lib/digest.ts"), "@/lib/nbaDate": load("lib/nbaDate.ts") };
  const digest = load("app/api/digest/route.ts", imports, { process: { env: { DIGEST_PUBLISH_TOKEN: token } } });
  const feedback = load("app/api/digest/feedback/route.ts", imports);
  const { NextRequest } = require("next/server");
  async function dispatch(path, method = "GET", body, authorized = false) {
    const request = new NextRequest("http://localhost" + path, { method, ...(body !== undefined ? {
      body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: `Bearer ${token}` } : {}) },
    } : {}) });
    return (path.split("?")[0].endsWith("/feedback") ? feedback : digest)[method](request);
  }
  async function check(path, method, body, status, authorized = false) {
    const response = await dispatch(path, method, body, authorized);
    const result = await response.json();
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  }
  const entry = { date: "2000-01-01", style: "casual", title: "Isolated digest write check", content: "Test content for publishing and reaction persistence." };
  const matcher = "**/api/digest**";
  try {
    await check("/api/digest", "POST", entry, 401);
    await check("/api/digest", "POST", { ...entry, date: "invalid" }, 400, true);
    await check("/api/digest/feedback", "POST", { date: entry.date, reaction: "invalid" }, 400);
    await check("/api/digest/feedback", "POST", { date: entry.date, reaction: "fire" }, 404);
    await check("/api/digest", "POST", entry, 201, true);
    assert.equal((await check("/api/digest?date=" + entry.date, "GET", undefined, 200)).digest.title, entry.title);
    entry.title += " updated";
    await check("/api/digest", "POST", entry, 201, true);
    const archive = await check("/api/digest?range=15", "GET", undefined, 200);
    assert.equal(archive.count, 1);
    assert.equal(archive.digests[0].title, entry.title);
    await Promise.all(["fire", "fire", "thumbsdown"].map((reaction) =>
      check("/api/digest/feedback", "POST", { date: entry.date, reaction }, 201)));
    const votes = async () => (await check("/api/digest/feedback", "GET", undefined, 200)).feedback[0];
    assert.deepEqual(await votes(), { date: entry.date, fire: 2, thumbsdown: 1, total: 3 });
    if (page) {
      await page.route(matcher, async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const response = await dispatch(url.pathname + url.search, request.method(), request.postDataJSON() ?? undefined);
        await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      });
      await page.goto("http://localhost:3000/digest");
      const reveal = page.getByRole("button", { name: "Reveal digest", exact: true });
      await page.getByRole("button", { name: /^(Reveal digest|Like this digest)$/ }).first().waitFor();
      if (await reveal.isVisible()) await reveal.click();
      const like = page.getByRole("button", { name: "Like this digest", exact: true });
      await like.waitFor();
      await like.click();
      await page.getByRole("status").filter({ hasText: "Reaction saved" }).waitFor();
      assert.equal(await like.getAttribute("aria-pressed"), "true");
      assert.equal(await like.isDisabled(), true);
      assert.deepEqual(await votes(), { date: entry.date, fire: 3, thumbsdown: 1, total: 4 });
    }
    return { publishing: "created, read back, replaced without duplicate", reactions: "concurrent writes preserved", validation: "unauthorized and invalid writes rejected", browser: page ? "saved and persisted" : "not run" };
  } finally {
    if (page) await page.unroute(matcher);
    await del(names.map((name) => prefix + name));
    for (const name of names) await assert.rejects(head(prefix + name), BlobNotFoundError);
    if (page) await page.goto("http://localhost:3000/digest");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(await testDigestWrites());
}
