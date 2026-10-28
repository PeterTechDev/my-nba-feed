import http from "node:http";
import https from "node:https";
import { test } from "@playwright/test";

// Limitations:
// (2) Same-origin redirects are fetched here and the final response is fulfilled
//     on the original route, so the page URL stays on the first address.
// (5) The body is buffered in full before it is fulfilled. Content-Encoding is
//     passed through unchanged; this does not stream or re-encode the body.

const HEADER = "x-vercel-protection-bypass";
// The default test timeout is 30s. There is no public getter for a page's
// navigation timeout, so this stays a fixed 20s: a hung origin fails the
// request first and leaves about 10s for the spec to record it.
const FETCH_TIMEOUT_MS = 20000;
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
    const chunks = [];
    let received = 0;
    let settled = false;
    let timedOut = false;
    let timer;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const ok = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const req = lib.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method,
      headers,
    }, (res) => {
      res.on("data", (chunk) => {
        received += chunk.length;
        chunks.push(chunk);
      });
      res.on("end", () => ok({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("aborted", () => {
        const error = new Error(timedOut ? "timeout" : "reset");
        error.timedOut = timedOut;
        error.midBody = !timedOut && received > 0;
        fail(error);
      });
      res.on("error", (error) => {
        error.timedOut = timedOut;
        error.midBody = !timedOut && received > 0;
        fail(error);
      });
    });
    // Total deadline. req.setTimeout would reset whenever a byte arrives.
    timer = setTimeout(() => {
      timedOut = true;
      req.destroy(new Error("timeout"));
    }, timeout);
    req.on("error", (error) => {
      if (timedOut) error.timedOut = true;
      else error.midBody = received > 0;
      fail(error);
    });
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
// POST on 301, 302, or 303 becomes GET with no body. 307 and 308 keep the method and body.
// Set-Cookie from an intermediate 3xx is sent on the next hop and on the final response.
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
    let headers = { ...(await route.request().allHeaders()), [HEADER]: bypass };
    for (const key of HOP_BY_HOP) delete headers[key];
    const carried = [];
    const absorbSetCookie = (responseHeaders) => {
      const raw = responseHeaders["set-cookie"];
      if (!raw) return;
      const lines = Array.isArray(raw) ? raw : String(raw).split("\n");
      for (const line of lines) {
        if (!line) continue;
        carried.push(line);
        const pair = line.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq <= 0) continue;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        const jar = new Map();
        if (headers.cookie) {
          for (const part of headers.cookie.split(";")) {
            const trimmed = part.trim();
            const cut = trimmed.indexOf("=");
            if (cut > 0) jar.set(trimmed.slice(0, cut), trimmed.slice(cut + 1));
          }
        }
        jar.set(name, value);
        headers.cookie = [...jar.entries()].map(([key, item]) => `${key}=${item}`).join("; ");
      }
    };
    const finish = async (result) => {
      absorbSetCookie(result.headers);
      const responseHeaders = { ...result.headers };
      if (carried.length) responseHeaders["set-cookie"] = carried.join("\n");
      await fulfill(route, { ...result, headers: responseHeaders });
    };
    try {
      for (let followed = 0; ; followed++) {
        const result = await nodeFetch({ url, method, headers, body: postData, timeout: FETCH_TIMEOUT_MS });
        const status = result.status;
        const location = Array.isArray(result.headers.location) ? result.headers.location[0] : result.headers.location;
        if (!REDIRECT.has(status) || !location) {
          await finish(result);
          return;
        }
        const next = new URL(location, url);
        if (next.origin !== appOrigin) {
          await finish(result);
          return;
        }
        if (followed >= MAX_REDIRECTS) {
          await route.abort().catch(() => {});
          report(`preview bypass exceeded ${MAX_REDIRECTS} redirects for ${method} ${pathnameOf(url)}`);
          return;
        }
        absorbSetCookie(result.headers);
        if ((status === 301 || status === 302 || status === 303) && method !== "GET" && method !== "HEAD") {
          method = "GET";
          postData = undefined;
          headers = withoutBody(headers);
        }
        url = next.href;
      }
    } catch (error) {
      await route.abort().catch(() => {});
      if (error && error.midBody) {
        report(`preview bypass connection reset while reading ${method} ${pathnameOf(url)}`);
        return;
      }
      if (isBenign(error) && !(error && error.timedOut)) return;
      report(`preview bypass fetch failed for ${method} ${pathnameOf(url)}`);
    }
  });
}

export function registerPreviewBypass() {
  test.beforeEach(async ({ page, baseURL }) => {
    await installPreviewBypass(page, baseURL || process.env.BASE_URL);
  });
}
