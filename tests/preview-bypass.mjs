import { test } from "@playwright/test";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

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
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-protection-bypass": bypass,
      },
    });
  });
}

export function registerPreviewBypass() {
  test.beforeEach(async ({ page, baseURL }) => {
    await installPreviewBypass(page, baseURL || process.env.BASE_URL);
  });
}
