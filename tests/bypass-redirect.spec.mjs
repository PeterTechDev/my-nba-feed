import assert from "node:assert/strict";
import http from "node:http";
import { chromium, expect, test } from "@playwright/test";
import { installPreviewBypass } from "./preview-bypass.mjs";

const FIXTURE = "fixture-bypass-not-secret";

function listen(handler, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once("error", (error) => {
      server.close();
      if (error.code === "EADDRINUSE" && port < 3399) resolve(listen(handler, port + 1));
      else reject(error);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function originOf(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

function hit(hits, path) {
  return hits.find((entry) => entry.path === path);
}

test("bypass header stays on the first origin for navigation, fetch, and iframe redirects", async () => {
  const appHits = [];
  const otherHits = [];
  const other = await listen((req, res) => {
    otherHits.push({ path: req.url.split("?")[0], bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    res.writeHead(200, { "content-type": "text/plain", "access-control-allow-origin": "*" });
    res.end("other");
  }, 3300);
  const otherOrigin = originOf(other);
  const app = await listen((req, res) => {
    const path = req.url.split("?")[0];
    appHits.push({ path, bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    if (path === "/nav" || path === "/hop-fetch" || path === "/hop-iframe") {
      const target = path === "/nav" ? "/land" : path === "/hop-fetch" ? "/from-fetch" : "/from-iframe";
      res.writeHead(302, { location: `${otherOrigin}${target}` });
      res.end();
      return;
    }
    if (path === "/page") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><iframe src="/hop-iframe"></iframe><script>fetch("/hop-fetch");</script>`);
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  }, other.address().port + 1);
  const appOrigin = originOf(app);
  const previous = process.env.VERCEL_BYPASS;
  process.env.VERCEL_BYPASS = FIXTURE;
  const browser = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks"] });
  const page = await browser.newPage();
  try {
    await installPreviewBypass(page, appOrigin);
    await page.goto(`${appOrigin}/nav`);
    await expect.poll(() => hit(otherHits, "/land")?.path).toBe("/land");
    assert.equal(hit(appHits, "/nav")?.bypass, FIXTURE);
    assert.equal(hit(otherHits, "/land")?.bypass, null);

    await page.goto(`${appOrigin}/page`);
    await expect.poll(() => hit(otherHits, "/from-fetch")?.path).toBe("/from-fetch");
    await expect.poll(() => hit(otherHits, "/from-iframe")?.path).toBe("/from-iframe");
    assert.equal(hit(appHits, "/hop-fetch")?.bypass, FIXTURE);
    assert.equal(hit(appHits, "/hop-iframe")?.bypass, FIXTURE);
    assert.equal(hit(otherHits, "/from-fetch")?.bypass, null);
    assert.equal(hit(otherHits, "/from-iframe")?.bypass, null);
  } finally {
    if (previous === undefined) delete process.env.VERCEL_BYPASS;
    else process.env.VERCEL_BYPASS = previous;
    await browser.close();
    await new Promise((resolve) => app.close(resolve));
    await new Promise((resolve) => other.close(resolve));
  }
});
