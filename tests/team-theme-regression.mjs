import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

export default async function runTeamThemeRegression(page) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/teams.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000");
  for (const team of exports.teams) {
    await page.getByRole("button", { name: "Change focus team", exact: true }).click();
    await page.getByRole("button", { name: `${team.city} ${team.name}`, exact: true }).click();
    await page.waitForFunction(color => document.documentElement.style.getPropertyValue("--team-primary") === color, team.primaryColor);
    const ratios = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const rgb = color => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = color => rgb(color).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
      const action = getComputedStyle(document.querySelector(".team-action"));
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("div");
      probe.className = "team-surface team-text";
      document.body.append(probe);
      const surface = getComputedStyle(probe);
      const values = {
        action: ratio(action.color, action.backgroundColor),
        accent: ratio(surface.color, surface.backgroundColor),
        detail: ratio(root.getPropertyValue("--team-detail"), surface.backgroundColor),
        hover: ratio(surface.color, root.getPropertyValue("--team-surface-hover")),
      };
      probe.remove();
      return values;
    });
    for (const [role, ratio] of Object.entries(ratios)) assert.ok(ratio >= (role === "detail" ? 3 : 4.5), `${team.name} ${role}: ${ratio}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${team.name}: overflow`);
  }
  return { result: "passed", teams: 30, checks: "theme updates, action/text/icon/hover contrast and overflow" };
}
