import http from "node:http";
import https from "node:https";
import { test } from "@playwright/test";

const HEADER = "x-vercel-protection-bypass";
const MAX_REDIRECTS = 5;
const REDIRECT = new Set([301, 302, 303, 307, 308]);
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "host"]);

const HOOKS = Symbol.for("preview-bypass-failure-hooks");

function hookSet() {
  if (!globalThis[HOOKS]) globalThis[HOOKS] = new Set();
  return globalThis[HOOKS];
}

export function setBypassFailureHook(fn) {
  const hooks = hookSet();
  hooks.clear();
  if (fn) hooks.add(fn);
}

function report(message) {
  for (const hook of hookSet()) hook(message);
  console.error(message);
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function pathnameOf(value) {
  try { return new URL(value).pathname; } catch { return "/"; }
}

function isBenign(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /disposed|aborted|Test ended|Target page, context or browser has been closed/i.test(message);
}

function withoutBody(headers) {
  const next = { ...headers };
  delete next["content-length"];
  delete next["content-type"];
  delete next["transfer-encoding"];
  return next;
}

function nodeFetch({ url, method, headers, body, timeout }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method,
      headers,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => req.destroy(new Error("timeout")));
    if (body && method !== "GET" && method !== "HEAD") req.write(body);
    req.end();
  });
}

async function fulfill(route, result) {
  const headers = {};
  for (const [key, value] of Object.entries(result.headers)) {
    if (value == null || HOP_BY_HOP.has(key)) continue;
    headers[key] = Array.isArray(value) ? value.join("\n") : String(value);
  }
  await route.fulfill({ status: result.status, headers, body: result.body });
}

// Same-origin redirects are requested again with the bypass header, up to 5 hops.
// 303 becomes GET and drops the body. 307 and 308 keep the method and body.
// A 3xx to any other origin is returned unchanged, so that hop is routed again
// and does not receive the header. The header is not passed to a Playwright API.
// A failed request is aborted and reported with only the method and pathname.
export async function installPreviewBypass(page, baseURL) {
  if (!baseURL) throw new Error("Set BASE_URL to the origin of the running app.");
  const hostname = new URL(baseURL).hostname;
  const bypass = process.env.VERCEL_BYPASS;
  if (!isLocalHost(hostname) && !bypass) {
    throw new Error("VERCEL_BYPASS ausente para um BASE_URL remoto");
  }
  if (!bypass) return;
  const appOrigin = new URL(baseURL).origin;
  await page.route("**/*", async (route) => {
    const current = new URL(route.request().url());
    if (current.origin !== appOrigin) {
      await route.continue();
      return;
    }
    let url = current.href;
    let method = route.request().method();
    let postData = route.request().postDataBuffer() ?? undefined;
    let headers = { ...route.request().headers(), [HEADER]: bypass };
    for (const key of HOP_BY_HOP) delete headers[key];
    try {
      for (let followed = 0; ; followed++) {
        const result = await nodeFetch({ url, method, headers, body: postData, timeout: 5000 });
        const status = result.status;
        const location = Array.isArray(result.headers.location) ? result.headers.location[0] : result.headers.location;
        if (!REDIRECT.has(status) || !location) {
          await fulfill(route, result);
          return;
        }
        const next = new URL(location, url);
        if (next.origin !== appOrigin) {
          await fulfill(route, result);
          return;
        }
        if (followed >= MAX_REDIRECTS) {
          await route.abort().catch(() => {});
          report(`preview bypass exceeded ${MAX_REDIRECTS} redirects for ${method} ${pathnameOf(url)}`);
          return;
        }
        if (status === 303) {
          method = "GET";
          postData = undefined;
          headers = withoutBody(headers);
        }
        url = next.href;
      }
    } catch (error) {
      await route.abort().catch(() => {});
      if (isBenign(error)) return;
      report(`preview bypass fetch failed for ${method} ${pathnameOf(url)}`);
    }
  });
}

export function registerPreviewBypass() {
  test.beforeEach(async ({ page, baseURL }) => {
    await installPreviewBypass(page, baseURL || process.env.BASE_URL);
  });
}
