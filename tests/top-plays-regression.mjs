import assert from "node:assert/strict";

// Run with a Playwright page and the app on localhost:3000.
export default async function runTopPlaysRegression(page) {
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  const p = await context.newPage();
  try {
    await p.route("**/api/highlights?kind=top-plays", route => route.fulfill({ json: { videos: [10, 5].map((topCount, i) => ({
      id: i ? "OTHER123456" : "DTNqMLNVBC8", date: `2026-10-${27 - i}`, topCount,
      thumbnail: "https://i.ytimg.com/vi/DTNqMLNVBC8/hqdefault.jpg", duration: 136,
    })) } }));
    await p.route("https://www.youtube-nocookie.com/**", route => route.fulfill({ contentType: "text/html", body: "Player fixture" }));
    await p.goto("http://localhost:3000/top-plays");
    await p.getByRole("button", { name: /Reveal Top 10/ }).waitFor();
    assert.equal(await p.locator("main img").count(), 0);
    await p.getByRole("button", { name: /Reveal Top 10/ }).click();
    const image = p.locator("main img").first();
    assert.match(await image.evaluate(el => getComputedStyle(el).animationName), /reveal/);
    await image.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await p.getByRole("button", { name: /Play Top 10/ }).click();
    const player = p.locator("main iframe");
    await player.evaluate(el => Promise.all(el.parentElement.getAnimations({ subtree: true }).map(animation => animation.finished)));
    assert.equal(await player.evaluate(el => getComputedStyle(el.parentElement, "::after").transform), "matrix(1, 0, 0, 0, 0, 0)");
    await p.getByRole("button", { name: "Close player", exact: true }).click();
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.getByRole("button", { name: /Play Top 10/ }).click();
    assert.equal(await player.evaluate(el => getComputedStyle(el).animationName), "none");
    assert.equal(await player.evaluate(el => getComputedStyle(el.parentElement, "::after").content), "none");
    await p.getByRole("button", { name: "Close player", exact: true }).click();
    await p.getByRole("button", { name: "Hide preview", exact: true }).click();
    assert.equal(await p.locator("main img").count(), 0);
    await p.setViewportSize({ width: 320, height: 844 });
    await p.getByRole("button", { name: /Reveal Top 5/ }).click();
    await p.getByRole("button", { name: /Play Top 5/ }).click();
    assert.ok(await player.evaluate(el => el.getBoundingClientRect().width) >= 280);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    return { passed: true };
  } finally {
    await context.close();
  }
}
