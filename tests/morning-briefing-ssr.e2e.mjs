import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readdir, stat } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

// Oracles copied from MorningBriefingCard. The only date string the component
// produces is toLocaleDateString("en-US", briefingDateFormat). The reserved
// slot is the invisible placeholder, not a live date.
const BRIEFING_DATE_FORMAT = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
};
const PLACEHOLDER = "Mon, Sep 30";
const PLACEHOLDER_MARKUP = `<span class="invisible" aria-hidden="true">${PLACEHOLDER}</span>`;
const APP_MARKER = "Morning Briefing";
const LISTEN_DEADLINE_MS = 20_000;

function protectionHeaders() {
  const bypass = process.env.VERCEL_BYPASS;
  return bypass ? { "x-vercel-protection-bypass": bypass } : {};
}

function briefingLabel(date) {
  const formatter = new Intl.DateTimeFormat("en-US", BRIEFING_DATE_FORMAT);
  return [...new Set([formatter.format(date), date.toLocaleDateString("en-US", BRIEFING_DATE_FORMAT)])];
}

function count(haystack, needle) {
  let found = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    found += 1;
    index += needle.length;
  }
  return found;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function newestMtime(dir) {
  let newest = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) newest = Math.max(newest, await newestMtime(full));
    else if (entry.isFile()) newest = Math.max(newest, (await stat(full)).mtimeMs);
  }
  return newest;
}

async function assertBuildIsCurrent() {
  const buildIdPath = join(root, ".next", "BUILD_ID");
  let buildMs;
  try {
    buildMs = (await stat(buildIdPath)).mtimeMs;
  } catch {
    throw new Error("No production build: .next/BUILD_ID is missing. Run `npm run build`, then `npm run test:ssr`. Or set BASE_URL to a server that is already running.");
  }
  let headMs;
  try {
    const { stdout } = await execFileAsync("git", ["log", "-1", "--format=%ct"], { cwd: root });
    headMs = Number(stdout.trim()) * 1000;
  } catch (error) {
    throw new Error(`Could not read the HEAD commit time, so the .next build cannot be checked. ${error instanceof Error ? error.message : error}`);
  }
  if (!Number.isFinite(headMs)) {
    throw new Error("Could not read the HEAD commit time, so the .next build cannot be checked. Run `npm run build`, then `npm run test:ssr`.");
  }
  if (buildMs + 2000 < headMs) {
    throw new Error(`The .next build is older than HEAD (${new Date(headMs).toISOString()}; BUILD_ID ${new Date(buildMs).toISOString()}). Run \`npm run build\`, then \`npm run test:ssr\`.`);
  }
  const srcMs = await newestMtime(join(root, "src"));
  if (buildMs + 2000 < srcMs) {
    throw new Error(`The .next build is older than source files (newest src mtime ${new Date(srcMs).toISOString()}; BUILD_ID ${new Date(buildMs).toISOString()}). Run \`npm run build\`, then \`npm run test:ssr\`.`);
  }
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForListen(port, child, logs) {
  const deadline = Date.now() + LISTEN_DEADLINE_MS;
  let pause = 50;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`next start exited ${child.exitCode ?? child.signalCode} before listening on 127.0.0.1:${port}\n${logs()}`);
    }
    if (await portOpen(port)) return;
    await delay(pause);
    pause = Math.min(pause * 2, 500);
  }
  throw new Error(`next start did not listen on 127.0.0.1:${port} within ${LISTEN_DEADLINE_MS}ms\n${logs()}`);
}

async function startProductionServer() {
  const port = await freePort();
  const child = spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.end();
  let output = "";
  const append = (chunk) => {
    output += chunk.toString();
    if (output.length > 20_000) output = output.slice(-20_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const logs = () => output.trim() || "(next start produced no output)";
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  };
  try {
    await waitForListen(port, child, logs);
  } catch (error) {
    await stop();
    throw error;
  }
  return { baseUrl: `http://127.0.0.1:${port}`, stop };
}

test("production homepage HTML reserves the Morning Briefing date instead of baking it", { timeout: 60_000 }, async () => {
  let baseUrl = process.env.BASE_URL;
  let stop = async () => {};
  if (!baseUrl) {
    await assertBuildIsCurrent();
    const server = await startProductionServer();
    baseUrl = server.baseUrl;
    stop = server.stop;
  }
  try {
    const origin = new URL(baseUrl);
    const instants = [new Date()];
    if (origin.hostname === "127.0.0.1" || origin.hostname === "localhost") {
      try {
        instants.push(new Date((await stat(join(root, ".next", "server", "app", "index.html"))).mtimeMs));
      } catch {
        // A remote server has no local prerender timestamp.
      }
    }
    const response = await fetch(new URL("/", origin), { headers: protectionHeaders(), redirect: "manual" });
    assert.equal(response.status, 200, `expected the app homepage at 200 with redirects left unfollowed, received ${response.status}`);
    const servedAt = new Date(response.headers.get("date") ?? Date.now());
    instants.push(servedAt);
    const html = await response.text();
    assert.ok(html.includes(APP_MARKER), "response is not the app homepage");
    const forbidden = [...new Set(instants.flatMap((instant) => briefingLabel(instant)))];
    assert.ok(forbidden.length > 0);
    for (const label of forbidden) {
      if (label === PLACEHOLDER) continue;
      assert.equal(count(html, label), 0, `SSR HTML contains the server/build briefing date ${JSON.stringify(label)}`);
    }
    const placeholderCount = count(html, PLACEHOLDER_MARKUP);
    assert.equal(placeholderCount, 1, "the invisible fixed-width placeholder is missing");
    if (forbidden.includes(PLACEHOLDER)) {
      assert.equal(count(html, PLACEHOLDER), placeholderCount, "the NBA day matches the placeholder text, and that text also appears outside the reserved slot");
    }
  } finally {
    await stop();
  }
});
