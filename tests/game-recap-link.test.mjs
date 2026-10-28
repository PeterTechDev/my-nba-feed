import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: id => imports[id] ?? require(id), Date, URLSearchParams });
  return exports;
}
const api = load('lib/api.ts');
const dates = load('lib/nbaDate.ts');
const props = { teamId: 2, date: dates.formatNBADate(), homeTeam: 'Boston Celtics', awayTeam: 'New York Knicks' };
function render(data, date = props.date) {
  let request;
  const component = load('components/GameRecapLink.tsx', {
    '@/hooks/useRemoteData': { useRemoteData: url => { request = url; return { data }; } },
    '@/lib/api': api, '@/lib/nbaDate': dates,
  }).default;
  return { html: renderToStaticMarkup(createElement(component, { ...props, date })), request };
}
test('recap opens the saved video and names its matchup accessibly', () => {
  const { html, request } = render({ videos: { [props.date]: { url: 'https://www.youtube.com/watch?v=fixture' } } });
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=fixture"/);
  assert.match(html, /Watch New York Knicks at Boston Celtics recap/);
  assert.match(html, /target="_blank"/);
  assert.equal(request, `/api/highlights?teamId=2&dates=${props.date}`);
});
test('missing or failed lookup falls back to matchup and date search; old games skip lookup', () => {
  for (const data of [null, { videos: {} }]) {
    const { html } = render(data);
    assert.ok(html.includes(api.getHighlightUrl(props.awayTeam, props.homeTeam, props.date)));
    assert.match(html, /Find New York Knicks at Boston Celtics recap/);
  }
  const old = render(null, '2020-01-02');
  assert.equal(old.request, null);
  assert.ok(old.html.includes('2020-01-02'));
});
