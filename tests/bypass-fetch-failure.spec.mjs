import assert from "node:assert/strict";
import http from "node:http";
import { expect, test } from "@playwright/test";
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

async function expectSafeFailure(page, origin, path, expected = `preview bypass fetch failed for GET ${path}`) {
  const previous = process.env.VERCEL_BYPASS;
  const seen = [];
  process.env.VERCEL_BYPASS = FIXTURE;
  setBypassFailureHook((message) => seen.push(message));
  try {
    await installPreviewBypass(page, origin);
    const started = Date.now();
    await expect(page.goto(`${origin}${path}`)).rejects.toThrow();
    await expect.poll(() => seen[0]).toBe(expected);
    assert.equal(seen.some((message) => message.includes(FIXTURE)), false);
    return Date.now() - started;
  } finally {
    setBypassFailureHook();
    if (previous === undefined) delete process.env.VERCEL_BYPASS;
    else process.env.VERCEL_BYPASS = previous;
  }
}

test("a dropped connection reports a fetch failure without the bypass value", async ({ page }) => {
  const server = await listen((req) => req.socket.destroy(), 3360);
  try {
    await expectSafeFailure(page, `http://127.0.0.1:${server.address().port}`, "/drop");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a stalled response reports a fetch failure without the bypass value", async ({ page }) => {
  const server = await listen(() => {}, 3370);
  page.setDefaultNavigationTimeout(28000);
  try {
    await expectSafeFailure(page, `http://127.0.0.1:${server.address().port}`, "/stall");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("slow body bytes still hit the total request timeout", async ({ page }) => {
  test.setTimeout(45000);
  const server = await listen((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.write("x");
    const drip = setInterval(() => res.write("x"), 1000);
    res.on("close", () => clearInterval(drip));
  }, 3372);
  page.setDefaultNavigationTimeout(28000);
  try {
    const elapsed = await expectSafeFailure(page, `http://127.0.0.1:${server.address().port}`, "/drip");
    assert.ok(elapsed < 25000, `elapsed ${elapsed}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a reset while the body is still arriving is logged without the bypass value", async ({ page }) => {
  const server = await listen((req, res) => {
    res.writeHead(200, { "content-type": "text/plain", "content-length": "1000" });
    res.write("hello");
    setTimeout(() => req.socket.destroy(), 100);
  }, 3376);
  try {
    await expectSafeFailure(
      page,
      `http://127.0.0.1:${server.address().port}`,
      "/reset",
      "preview bypass connection reset while reading GET /reset",
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
