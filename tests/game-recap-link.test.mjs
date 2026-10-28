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
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: id => imports[id] ?? require(id), Date, URLSearchParams });
  return exports;
}
const api = load('lib/api.ts');
const dates = load('lib/nbaDate.ts');
const props = { teamId: 2, date: dates.formatNBADate(), homeTeam: 'Boston Celtics', awayTeam: 'New York Knicks' };
function render(data, date = props.date) {

  const component = load('components/GameRecapLink.tsx', {
    '@/lib/api': api, '@/lib/nbaDate': dates,
  }).default;
  return { html: renderToStaticMarkup(createElement(component, { ...props, date, video: data?.videos[date] })) };
}
test('recap opens the saved video and names its matchup accessibly', () => {
  const { html } = render({ videos: { [props.date]: { url: 'https://www.youtube.com/watch?v=fixture' } } });
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=fixture"/);
  assert.match(html, /Watch New York Knicks at Boston Celtics recap/);
  assert.match(html, /target="_blank"/);

});
test('missing or failed lookup falls back to matchup and date search; old games skip lookup', () => {
  for (const data of [null, { videos: {} }]) {
    const { html } = render(data);
    assert.ok(html.includes(api.getHighlightUrl(props.awayTeam, props.homeTeam, props.date)));
    assert.match(html, /Find New York Knicks at Boston Celtics recap/);
  }
  const old = render(null, '2020-01-02');

  assert.ok(old.html.includes('2020-01-02'));
});

test('schedule batches recent dates once for both calendar and agenda, within the API limit', () => {
  let urls;
  const games = Array.from({ length: 16 }, (_, i) => ({
    id: i, date: `2026-10-${String(i + 1).padStart(2, '0')}`, status: 'Final',
    homeTeam: { id: 2, name: 'Celtics', abbreviation: 'BOS' }, awayTeam: { id: 20, name: 'Knicks', abbreviation: 'NYK' },
  }));
  const page = load('app/schedule/page.tsx', {
    react: { useState: value => [value instanceof Date ? new Date('2026-10-28T12:00:00Z') : value, () => {}] },
    '@/hooks/useRemoteData': { useRemoteData: () => ({ data: { games } }), useRemoteDataAll: requests => { urls = requests; return requests.map(() => ({ data: { videos: {} } })); } },
    '@/hooks/useTeam': { useTeam: () => ({ selectedTeam: games[0].homeTeam }) },
    '@/components/SpoilerModeProvider': { useSpoilerContext: () => ({ hideScores: true }) },
    '@/components/TeamSelector': { default: () => null }, '@/components/DataError': { default: () => null },
    '@/components/GoogleCalendarLink': { default: () => null },
    '@/components/GameRecapLink': { default: () => null },
    '@/lib/nbaDate': { ...dates, formatNBADate: date => date ? '2026-09-28' : '2026-10-28' },
    '@/lib/gameStatus': load('lib/gameStatus.ts'),
  }).default;
  renderToStaticMarkup(createElement(page));
  assert.equal(urls.length, 2);
  assert.deepEqual(Array.from(urls, url => new URL(url, 'https://fixture').searchParams.get('dates').split(',').length), [15, 1]);
});
