import { test } from "@playwright/test";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

// The bypass header is added only on the BASE_URL origin. route.fetch does not
// follow redirects (maxRedirects: 0): a 3xx is fulfilled as-is. The browser's
// next request is routed again and receives the header only when that hop is
// still this origin. route.continue() would let the header ride along to the
// redirect target.
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
    if (new URL(route.request().url()).origin !== appOrigin) {
      await route.continue();
      return;
    }
    try {
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          "x-vercel-protection-bypass": bypass,
        },
        maxRedirects: 0,
      });
      await route.fulfill({ response });
    } catch (error) {
      // An aborted prefetch disposes the fetch response. continue() here would
      // send the header on to a redirect, so abort the already-dead request.
      const message = error instanceof Error ? error.message : String(error);
      if (!/disposed|aborted|Test ended|Target page, context or browser has been closed/i.test(message)) throw error;
      await route.abort().catch(() => {});
    }
  });
}

export function registerPreviewBypass() {
  test.beforeEach(async ({ page, baseURL }) => {
    await installPreviewBypass(page, baseURL || process.env.BASE_URL);
  });
}
