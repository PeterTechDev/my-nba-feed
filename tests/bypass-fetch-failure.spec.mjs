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

async function expectSafeFailure(page, origin, path) {
  const previous = process.env.VERCEL_BYPASS;
  const seen = [];
  process.env.VERCEL_BYPASS = FIXTURE;
  setBypassFailureHook((message) => seen.push(message));
  try {
    await installPreviewBypass(page, origin);
    await expect(page.goto(`${origin}${path}`)).rejects.toThrow();
    await expect.poll(() => seen[0]).toBe(`preview bypass fetch failed for GET ${path}`);
    assert.equal(seen.some((message) => message.includes(FIXTURE)), false);
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
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a stalled response reports a fetch failure without the bypass value", async ({ page }) => {
  const server = await listen(() => {}, 3370);
  page.setDefaultNavigationTimeout(15000);
  try {
    await expectSafeFailure(page, `http://127.0.0.1:${server.address().port}`, "/stall");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
