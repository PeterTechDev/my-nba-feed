import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createConnection, createServer } from "node:net";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

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

function waitForListen(port, child) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        reject(new Error(`next start exited ${child.exitCode ?? child.signalCode} before listening on ${port}`));
        return;
      }
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        setImmediate(attempt);
      });
    };
    attempt();
  });
}

async function startProductionServer() {
  const port = await freePort();
  const child = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    detached: true,
    stdio: "ignore",
  });
  try {
    await waitForListen(port, child);
  } catch (error) {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
    throw error;
  }
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      if (child.exitCode === null && child.signalCode === null) {
        try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
        await once(child, "exit");
      }
    },
  };
}

test("production homepage HTML reserves the Morning Briefing date instead of baking it", async () => {
  let baseUrl = process.env.BASE_URL;
  let stop = async () => {};
  if (!baseUrl) {
    const server = await startProductionServer();
    baseUrl = server.baseUrl;
    stop = server.stop;
  }
  try {
    const origin = new URL(baseUrl);
    const instants = [new Date()];
    if (origin.hostname === "127.0.0.1" || origin.hostname === "localhost") {
      const builtPage = new URL("../.next/server/app/index.html", import.meta.url);
      try {
        instants.push(new Date((await stat(builtPage)).mtimeMs));
      } catch {
        // A remote or not-yet-built tree has no local prerender timestamp.
      }
    }
    const response = await fetch(new URL("/", origin));
    assert.equal(response.status, 200);
    const servedAt = new Date(response.headers.get("date") ?? Date.now());
    instants.push(servedAt);
    const html = await response.text();
    const forbidden = [...new Set(instants.flatMap((instant) => briefingLabel(instant)))];
    assert.ok(forbidden.length > 0);
    for (const label of forbidden) {
      assert.notEqual(label, PLACEHOLDER, `briefing label ${label} collides with the placeholder`);
      assert.equal(count(html, label), 0, `SSR HTML contains the server/build briefing date ${JSON.stringify(label)}`);
    }
    assert.equal(count(html, PLACEHOLDER_MARKUP), 1, "the invisible fixed-width placeholder is missing");
  } finally {
    await stop();
  }
});
