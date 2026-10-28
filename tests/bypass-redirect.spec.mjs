import assert from "node:assert/strict";
import http from "node:http";
import { chromium, expect, test } from "@playwright/test";
import { installPreviewBypass, setBypassFailureHook } from "./preview-bypass.mjs";

const FIXTURE = ["FAKE", "BYPASS", "7f3a91"].join("-");

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

function bodyOf(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", () => resolve(""));
  });
}

async function withPage(fn) {
  const previous = process.env.VERCEL_BYPASS;
  process.env.VERCEL_BYPASS = FIXTURE;
  const browser = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks"] });
  const page = await browser.newPage();
  try {
    await fn(page);
  } finally {
    if (previous === undefined) delete process.env.VERCEL_BYPASS;
    else process.env.VERCEL_BYPASS = previous;
    await browser.close();
  }
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
  try {
    await withPage(async (page) => {
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
    });
  } finally {
    await new Promise((resolve) => app.close(resolve));
    await new Promise((resolve) => other.close(resolve));
  }
});

test("a same-origin 302 is refetched with the bypass header", async () => {
  const hits = [];
  const app = await listen(async (req, res) => {
    const path = req.url.split("?")[0];
    const body = await bodyOf(req);
    hits.push({ path, method: req.method, body, bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    if (path === "/a") {
      res.writeHead(302, { location: "/b" });
      res.end();
      return;
    }
    if (req.headers["x-vercel-protection-bypass"] !== FIXTURE) {
      res.writeHead(401, { "content-type": "text/plain" });
      res.end("nope");
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok-b");
  }, 3320);
  try {
    await withPage(async (page) => {
      await installPreviewBypass(page, originOf(app));
      await page.goto(`${originOf(app)}/a`);
      await expect(page.getByText("ok-b", { exact: true })).toBeVisible();
      assert.equal(hit(hits, "/a")?.bypass, FIXTURE);
      assert.equal(hit(hits, "/b")?.bypass, FIXTURE);
    });
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});

test("a same-origin hop stops before a cross-origin redirect and omits the header there", async () => {
  const appHits = [];
  const otherHits = [];
  const other = await listen((req, res) => {
    otherHits.push({ path: req.url.split("?")[0], bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("other");
  }, 3330);
  const otherOrigin = originOf(other);
  const app = await listen((req, res) => {
    const path = req.url.split("?")[0];
    appHits.push({ path, bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    if (path === "/chain") {
      res.writeHead(302, { location: "/mid" });
      res.end();
      return;
    }
    if (path === "/mid") {
      res.writeHead(302, { location: `${otherOrigin}/end` });
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  }, other.address().port + 1);
  try {
    await withPage(async (page) => {
      await installPreviewBypass(page, originOf(app));
      await page.goto(`${originOf(app)}/chain`);
      await expect.poll(() => hit(otherHits, "/end")?.path).toBe("/end");
      assert.equal(hit(appHits, "/chain")?.bypass, FIXTURE);
      assert.equal(hit(appHits, "/mid")?.bypass, FIXTURE);
      assert.equal(hit(otherHits, "/end")?.bypass, null);
    });
  } finally {
    await new Promise((resolve) => app.close(resolve));
    await new Promise((resolve) => other.close(resolve));
  }
});

test("same-origin redirects stop after 5 hops", async () => {
  const app = await listen((req, res) => {
    const path = req.url.split("?")[0];
    const step = Number(path.split("/").at(-1));
    res.writeHead(302, { location: `/h/${step + 1}` });
    res.end();
  }, 3340);
  try {
    await withPage(async (page) => {
      const seen = [];
      setBypassFailureHook((message) => seen.push(message));
      await installPreviewBypass(page, originOf(app));
      await expect(page.goto(`${originOf(app)}/h/0`)).rejects.toThrow();
      await expect.poll(() => seen[0]).toBe("preview bypass exceeded 5 redirects for GET /h/5");
      setBypassFailureHook();
    });
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});

test("303 becomes GET and 307 keeps the POST body", async () => {
  const hits = [];
  const app = await listen(async (req, res) => {
    const path = req.url.split("?")[0];
    const body = await bodyOf(req);
    hits.push({ path, method: req.method, body, bypass: req.headers["x-vercel-protection-bypass"] ?? null });
    if (path === "/to-get") {
      res.writeHead(303, { location: "/got" });
      res.end();
      return;
    }
    if (path === "/keep") {
      res.writeHead(307, { location: "/kept" });
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("done");
  }, 3350);
  try {
    await withPage(async (page) => {
      await installPreviewBypass(page, originOf(app));
      await page.goto(`${originOf(app)}/start`);
      const status = await page.evaluate(async () => {
        const post = (path) => fetch(path, { method: "POST", body: "payload", headers: { "content-type": "text/plain" } });
        return { toGet: (await post("/to-get")).status, keep: (await post("/keep")).status };
      });
      assert.deepEqual(status, { toGet: 200, keep: 200 });
      assert.equal(hit(hits, "/got")?.method, "GET");
      assert.equal(hit(hits, "/got")?.body, "");
      assert.equal(hit(hits, "/got")?.bypass, FIXTURE);
      assert.equal(hit(hits, "/kept")?.method, "POST");
      assert.equal(hit(hits, "/kept")?.body, "payload");
      assert.equal(hit(hits, "/kept")?.bypass, FIXTURE);
    });
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});
