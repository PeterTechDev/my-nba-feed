import assert from "node:assert/strict";
import http from "node:http";
import { chromium, expect, test } from "@playwright/test";
import { installPreviewBypass, setBypassFailureHook } from "./preview-bypass.mjs";

const FIXTURE = ["FAKE", "BYPASS", "7f3a91"].join("-");
const COOKIE = ["FAKE", "COOKIE", "c41d02"].join("-");

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
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
    other.closeAllConnections();
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
    app.closeAllConnections();
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
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
    other.closeAllConnections();
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
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
  }
});

for (const status of [301, 302, 303, 307, 308]) {
  const drop = status === 301 || status === 302 || status === 303;
  test(`POST ${status} ${drop ? "becomes GET without a body" : "keeps the method and body"}`, async () => {
    const hits = [];
    const app = await listen(async (req, res) => {
      const path = req.url.split("?")[0];
      const body = await bodyOf(req);
      hits.push({
        path,
        method: req.method,
        body,
        type: req.headers["content-type"] ?? null,
        length: req.headers["content-length"] ?? null,
        bypass: req.headers["x-vercel-protection-bypass"] ?? null,
      });
      if (path === "/from") {
        res.writeHead(status, { location: "/landed" });
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("done");
    }, 3350 + (status - 301));
    try {
      await withPage(async (page) => {
        await installPreviewBypass(page, originOf(app));
        await page.goto(`${originOf(app)}/start`);
        const code = await page.evaluate(async () => {
          const response = await fetch("/from", { method: "POST", body: "payload", headers: { "content-type": "text/plain" } });
          return response.status;
        });
        assert.equal(code, 200);
        const landed = hit(hits, "/landed");
        assert.equal(landed?.bypass, FIXTURE);
        if (drop) {
          assert.equal(landed?.method, "GET");
          assert.equal(landed?.body, "");
          assert.equal(landed?.type, null);
          assert.equal(landed?.length, null);
        } else {
          assert.equal(landed?.method, "POST");
          assert.equal(landed?.body, "payload");
          assert.equal(landed?.type, "text/plain");
        }
      });
    } finally {
      app.closeAllConnections();
      await new Promise((resolve) => app.close(resolve));
    }
  });
}

test("a context cookie reaches the same-origin bypass hop and not the next origin", async () => {
  const appHits = [];
  const otherHits = [];
  const record = (hits, req) => hits.push({
    path: req.url.split("?")[0],
    bypass: req.headers["x-vercel-protection-bypass"] ?? null,
    cookie: req.headers.cookie ?? null,
  });
  const other = await listen((req, res) => {
    record(otherHits, req);
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("other");
  }, 3384);
  const otherOrigin = `http://localhost:${other.address().port}`;
  const app = await listen((req, res) => {
    const path = req.url.split("?")[0];
    record(appHits, req);
    if (path === "/cookie-a") {
      res.writeHead(302, { location: "/cookie-b" });
      res.end();
      return;
    }
    if (path === "/cookie-b") {
      res.writeHead(302, { location: `${otherOrigin}/cookie-land` });
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  }, other.address().port + 1);
  try {
    await withPage(async (page) => {
      const origin = originOf(app);
      await page.context().addCookies([{ name: "session", value: COOKIE, url: origin }]);
      await installPreviewBypass(page, origin);
      await page.goto(`${origin}/cookie-a`);
      await expect.poll(() => hit(otherHits, "/cookie-land")?.path).toBe("/cookie-land");
      assert.equal(hit(appHits, "/cookie-a")?.cookie, `session=${COOKIE}`);
      assert.equal(hit(appHits, "/cookie-b")?.cookie, `session=${COOKIE}`);
      assert.equal(hit(appHits, "/cookie-a")?.bypass, FIXTURE);
      assert.equal(hit(appHits, "/cookie-b")?.bypass, FIXTURE);
      assert.equal(hit(otherHits, "/cookie-land")?.bypass, null);
      assert.equal(hit(otherHits, "/cookie-land")?.cookie, null);
    });
  } finally {
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
    other.closeAllConnections();
    await new Promise((resolve) => other.close(resolve));
  }
});

test("Set-Cookie from two redirect hops is sent on the next hop and to the browser", async () => {
  const hits = [];
  const app = await listen((req, res) => {
    const path = req.url.split("?")[0];
    hits.push({ path, cookie: req.headers.cookie ?? "" });
    if (path === "/set-a") {
      res.writeHead(302, { location: "/set-b", "set-cookie": "one=hop1; Path=/" });
      res.end();
      return;
    }
    if (path === "/set-b") {
      res.writeHead(302, { location: "/set-c", "set-cookie": "two=hop2; Path=/" });
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("landed");
  }, 3388);
  try {
    await withPage(async (page) => {
      const origin = originOf(app);
      await installPreviewBypass(page, origin);
      await page.goto(`${origin}/set-a`);
      await expect(page.getByText("landed", { exact: true })).toBeVisible();
      assert.match(hit(hits, "/set-b")?.cookie ?? "", /(?:^|;\s*)one=hop1(?:;|$)/);
      assert.doesNotMatch(hit(hits, "/set-b")?.cookie ?? "", /two=/);
      assert.match(hit(hits, "/set-c")?.cookie ?? "", /(?:^|;\s*)one=hop1(?:;|$)/);
      assert.match(hit(hits, "/set-c")?.cookie ?? "", /(?:^|;\s*)two=hop2(?:;|$)/);
      const stored = (await page.context().cookies(origin)).map((cookie) => `${cookie.name}=${cookie.value}`).sort();
      assert.deepEqual(stored, ["one=hop1", "two=hop2"]);
    });
  } finally {
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
  }
});
