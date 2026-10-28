import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// PET-32: SPOILERS and the isSpoiler helper in src/app/api/news/route.ts.
// Each row is the headline, the expected boolean, and the reason.
// Classification goes through fetchNews (isSpoiler = SPOILERS.test(title)), same loader as tests/app-data.test.mjs.
//
// "Celtics up 2-1" segue expected true. No 6b77636 o padrão up N-N passa a casar.
// A expectativa não foi afrouxada.
// O primeiro script do Dev também marcou "2-1 in the series" como visível; a tabela publicada corrigiu para spoiler.
// "Celtics in a blowout" saiu como BAD (expect visível) e o Dev corrigiu: blowout permanece spoiler.

const require = createRequire(import.meta.url);
function load(file, globals = {}, imports = {}) {
  const source = readFileSync(new URL("../src/" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const scope = { exports, require: (id) => imports[id] ?? (id.endsWith(".module.css") ? { default: new Proxy({}, { get: (_target, key) => key }) } : require(id)), Date, URL, AbortSignal, Response, Buffer, setTimeout, ...globals };
  vm.runInNewContext(code, scope);
  return { exports, code, scope };
}

const teams = load("lib/teams.ts").exports;
const api = load("lib/api.ts").exports;
const newsTools = load("lib/news.ts", {}, { "./api": api, "./teams": teams }).exports;
let feedXml = "";
const route = load("app/api/news/route.ts", {
  fetch: async () => ({ ok: true, text: async () => feedXml }),
}, {
  "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
  "@/lib/teams": teams,
  "@/lib/api": api,
  "@/lib/news": newsTools,
  "@/lib/communityFeed": load("lib/communityFeed.ts").exports,
}).exports;

const pubDate = new Date(Date.now() - 60 * 60 * 1000).toUTCString();
let chain = Promise.resolve();
let seq = 0;
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function classify(headline) {
  const run = chain.then(async () => {
    const id = ++seq;
    feedXml = `<rss><item><title>${escapeXml(headline)}</title><source>ESPN</source><link>https://news.google.com/rss/articles/${id}</link><pubDate>${pubDate}</pubDate></item></rss>`;
    // none is the only token that returns the raw headline. The table checks that text, not the redacted default.
    const result = await route.GET({
      nextUrl: new URL("http://localhost/api/news?team=NBA"),
      headers: new Headers({ "x-nba-spoilers": "none" }),
    });
    assert.equal(result.status, 200, headline);
    assert.equal(result.body.length, 1, headline);
    return result.body[0];
  });
  chain = run.then(() => {}, () => {});
  return run;
}

// Preço aceito: esconder estas manchetes é o custo combinado do filtro. Elas devem dar true.
const acceptedPrice = [
  { headline: "Top 10 plays", expected: true, reason: "preço aceito: top em ranking" },
  { headline: "Tatum down with an ankle injury", expected: true, reason: "preço aceito: down de lesão" },
  { headline: "Advanced stats", expected: true, reason: "preço aceito: advanced casa com advance" },
  { headline: "Celtics at 3-1 odds", expected: true, reason: "preço aceito: at N-N também esconde odd de aposta" },
  { headline: "The odds are 3-1", expected: true, reason: "preço aceito: are N-N pega odd sem ser retrospecto" },
  { headline: "improve to 3-1 in preseason", expected: true, reason: "preço aceito: improve to N-N não distingue pré-temporada" },
  { headline: "How to practice a buzzer-beating move", expected: true, reason: "preço aceito: buzzer-beating em treino" },
  { headline: "Tatum carries the ball over half court", expected: true, reason: "preço aceito: carries … over sem ser resultado" },
  { headline: "Celtics hold off on trade", expected: true, reason: "preço aceito: hold off também é adiar uma decisão" },
];

// Tabela publicada pelo Dev (coluna Depois do PR #10). Onde ela diverge do critério PET-32, o critério prevalece.
const devTable = [
  { headline: "Celtics take 2-1 series lead", expected: true, reason: "placar de série com hífen, seguido de series lead" },
  { headline: "Knicks top Celtics", expected: true, reason: "verbo top" },
  { headline: "Lakers beat Suns 112-104", expected: true, reason: "beat e placar de jogo" },
  { headline: "Heat edge Bulls", expected: true, reason: "edge" },
  { headline: "Nuggets rout Jazz", expected: true, reason: "rout" },
  { headline: "Warriors fall to Kings", expected: true, reason: "fall to" },
  { headline: "Bucks stun Sixers", expected: true, reason: "stun" },
  { headline: "Celtics sweep Heat", expected: true, reason: "sweep" },
  { headline: "Thunder force Game 7", expected: true, reason: "force Game N" },
  { headline: "Mavs hold off Clippers", expected: true, reason: "hold off" },
  { headline: "Jayson Tatum lifts Celtics past Nets with OT buzzer-beater after brutal Mikel Brown blunder", expected: true, reason: "lifts … past e buzzer-beater" },
  { headline: "OT buzzer-beater from Jayson Tatum", expected: true, reason: "buzzer-beater" },
  { headline: "Watch the buzzer beater again", expected: true, reason: "buzzer beater" },
  { headline: "That buzzerbeater saved Boston", expected: true, reason: "buzzerbeater" },
  { headline: "Jayson Tatum gives bold warning to rest of NBA after Celtics game winner", expected: true, reason: "game winner" },
  { headline: "Celtics game-winner came at the horn", expected: true, reason: "game-winner" },
  { headline: "A game-winning layup from Tatum", expected: true, reason: "game-winning" },
  { headline: "LeBron injury update", expected: false, reason: "não-spoiler" },
  { headline: "Trade rumors: Lakers eye guard", expected: false, reason: "não-spoiler" },
  { headline: "Wembanyama talks offseason training", expected: false, reason: "não-spoiler" },
  { headline: "How to watch Celtics vs Knicks tonight", expected: false, reason: "não-spoiler" },
  { headline: "Draft prospects to watch", expected: false, reason: "não-spoiler" },
  { headline: "Celtics 2025-26 schedule released", expected: false, reason: "2025-26 não é placar" },
  { headline: "Nets grab 3–2 series lead", expected: true, reason: "placar de série com en dash" },
  { headline: "Celtics 4—0 series lead", expected: true, reason: "placar de série com em dash" },
  { headline: "2-1 in the series", expected: true, reason: "até 3 palavras entre placar e series" },
  { headline: "Celtics take the series lead", expected: true, reason: "series lead sem número" },
  { headline: "Heat eliminate Knicks", expected: true, reason: "eliminate" },
  { headline: "Wolves advance to the second round", expected: true, reason: "advance" },
  { headline: "Suns outlast Kings", expected: true, reason: "outlast" },
  { headline: "Pacers crush Hawks", expected: true, reason: "crush" },
  { headline: "Cavs cruise past Magic", expected: true, reason: "cruise past" },
  { headline: "Spurs rally past Grizzlies", expected: true, reason: "rally past" },
  { headline: "Rockets upset Thunder", expected: true, reason: "upset" },
  { headline: "Clippers sink Nuggets", expected: true, reason: "sink" },
  { headline: "Sixers topple Celtics", expected: true, reason: "topple" },
  { headline: "Lakers down Warriors", expected: true, reason: "down" },
  { headline: "Celtics lead the East in defense", expected: false, reason: "lead sozinho não dispara" },
  { headline: "Series preview: Celtics host Knicks", expected: false, reason: "series sozinha não dispara" },
  { headline: "Game 7 preview: what to watch", expected: false, reason: "Game 7 sem force continua visível" },
  { headline: "Celtics trade out of Boston denied", expected: false, reason: "caso do teste existente" },
  { headline: "Celtics won 118-107", expected: true, reason: "won e placar" },
  { headline: "Celtics winless start", expected: true, reason: "winless" },
  { headline: "Top 10 plays from last night", expected: true, reason: "falso positivo aceito (top)" },
  { headline: "Celtics look to close it down the stretch", expected: true, reason: "falso positivo (down)" },
  { headline: "Sit-down with Joe Mazzulla", expected: true, reason: "falso positivo (down)" },
  { headline: "In advance of the trade deadline", expected: true, reason: "falso positivo (advance)" },
  { headline: "Advanced stats the Celtics should watch", expected: true, reason: "falso positivo (advanced)" },
  { headline: "Fans upset with the rotation", expected: true, reason: "falso positivo (upset)" },
  { headline: "Celtics eye a sweep of the season", expected: true, reason: "falso positivo (sweep)" },
  { headline: "Tatum lifts the ball past the help defender", expected: true, reason: "falso positivo (lift … past)" },
  { headline: "How to practice a buzzer-beater", expected: true, reason: "falso positivo (buzzer-beater)" },
  { headline: "Tatum lifts teammates in practice", expected: false, reason: "lift sem past continua visível" },
  { headline: "Jayson Tatum gives a bold warning to the rest of the NBA", expected: false, reason: "sem game winner continua visível" },
  { headline: "Celtics game plan for the Knicks", expected: false, reason: "game plan não é game winner" },
  { headline: "Celtics up 2-1", expected: true, reason: "up N-N é spoiler; expectativa mantida" },
  { headline: "Best plays from the Celtics", expected: false, reason: "não-spoiler" },
  { headline: "Preview: Celtics vs Knicks", expected: false, reason: "preview não é resultado" },
  { headline: "Thunder force a Game 7", expected: true, reason: "force a Game N" },
];

// Manchetes extras declaradas nos scripts de verificação do Dev (resultado de ferramenta), com o esperado final dele.
const devScripts = [
  { headline: "Celtics blow out Wizards", expected: true, reason: "script do Dev: blow out" },
  { headline: "Knicks win in overtime", expected: true, reason: "script do Dev: win" },
  { headline: "Celtics lost to the Heat", expected: true, reason: "script do Dev: lost" },
  { headline: "Final: Celtics 118-107", expected: true, reason: "script do Dev: final e placar" },
  { headline: "Celtics lead 2-0", expected: true, reason: "script do Dev: lead seguido de placar" },
  { headline: "series 4-0 after the closeout", expected: true, reason: "script do Dev: series seguido de placar" },
  { headline: "Celtics swept the Heat", expected: true, reason: "script do Dev: swept" },
  { headline: "Mavericks forced Game 7", expected: true, reason: "script do Dev: forced Game N" },
  { headline: "Heat edged the Bulls 101-99", expected: true, reason: "script do Dev: edged e placar" },
  { headline: "Celtics fell to the Knicks", expected: true, reason: "script do Dev: fell to" },
  { headline: "Nets holds off the Hornets", expected: true, reason: "script do Dev: holds off" },
  { headline: "Kings crushed the Jazz", expected: true, reason: "script do Dev: crushed" },
  { headline: "Bucks stunned the Sixers", expected: true, reason: "script do Dev: stunned" },
  { headline: "Warriors toppled the Lakers", expected: true, reason: "script do Dev: toppled" },
  { headline: "Celtics defeated the Heat", expected: true, reason: "script do Dev: defeated" },
  { headline: "Bulls outlasted the Hawks", expected: true, reason: "script do Dev: outlasted" },
  { headline: "Magic cruised past the Pistons", expected: true, reason: "script do Dev: cruised past" },
  { headline: "Hawks rallied past the Nets", expected: true, reason: "script do Dev: rallied past" },
  { headline: "Celtics elimination looms", expected: true, reason: "script do Dev: elimination" },
  { headline: "Knicks advancing to the East finals", expected: true, reason: "script do Dev: advancing" },
  { headline: "Jayson Tatum extension talks", expected: false, reason: "script do Dev: não-spoiler" },
  { headline: "Starting lineup for tonight", expected: false, reason: "script do Dev: não-spoiler" },
  { headline: "Celtics practice report ahead of tip", expected: false, reason: "script do Dev: não-spoiler" },
  { headline: "Wembanyama questions the whistle", expected: false, reason: "script do Dev: não-spoiler" },
  { headline: "How the Celtics built their roster", expected: false, reason: "script do Dev: não-spoiler" },
  { headline: "Top story: Celtics practice habits", expected: true, reason: "script do Dev: falso positivo de top" },
  { headline: "cutting-edge offense takes shape", expected: true, reason: "script do Dev: edge depois do hífen" },
  { headline: "Celtics 4-0 series lead", expected: true, reason: "script do Dev: placar de série com hífen" },
  { headline: "lead 3–2 over the Knicks", expected: true, reason: "script do Dev: lead seguido de placar com en dash" },
  { headline: "KNICKS TOP CELTICS", expected: true, reason: "script do Dev: top em maiúsculas" },
  { headline: "celtics TAKE 2-1 SERIES LEAD", expected: true, reason: "script do Dev: series lead em maiúsculas" },
  { headline: "stop the Celtics", expected: false, reason: "script do Dev: top dentro de stop não casa" },
  { headline: "downtown Boston watch party", expected: false, reason: "script do Dev: down dentro de downtown não casa" },
  { headline: "countdown to opening night", expected: false, reason: "script do Dev: down dentro de countdown não casa" },
  { headline: "window to win the East", expected: true, reason: "script do Dev: win" },
  { headline: "route to the Finals", expected: false, reason: "script do Dev: rout dentro de route não casa" },
  { headline: "blowout win for the Celtics", expected: true, reason: "script do Dev: blowout e win" },
  { headline: "Celtics in a blowout", expected: true, reason: "script do Dev: blowout; expect visível foi corrigido pelo Dev para spoiler" },
  { headline: "Tatum lifts the Celtics past the Nets", expected: true, reason: "script do Dev: lifts … past" },
  { headline: "Tatum lift Celtics past Nets", expected: true, reason: "script do Dev: lift … past" },
  { headline: "Tatum lifted the short-handed Celtics past Miami", expected: true, reason: "script do Dev: lifted … past" },
  { headline: "Brown lifting Boston past New York", expected: true, reason: "script do Dev: lifting … past" },
  { headline: "Celtics buzzer-beater stuns the Nets", expected: true, reason: "script do Dev: buzzer-beater e stun" },
  { headline: "Buzzer-beaters from last night", expected: true, reason: "script do Dev: plural buzzer-beaters" },
  { headline: "buzzer  beater in overtime", expected: true, reason: "script do Dev: buzzer beater com espaço duplo" },
  { headline: "game winning shot at the buzzer", expected: true, reason: "script do Dev: game winning" },
  { headline: "game winners are a skill", expected: true, reason: "script do Dev: game winners" },
  { headline: "series is now 2-1", expected: true, reason: "script do Dev: placar precedido de series" },
];

// Grafias maiúsculas de buzzer-beater exigidas pelo critério e ausentes da tabela do Dev.
const criterionSpellings = [
  { headline: "Celtics lead 4—0", expected: true, reason: "placar com em dash precedido de lead, sem a frase series lead" },
  { headline: "Celtics BUZZER-BEATER", expected: true, reason: "buzzer-beater em maiúsculas" },
  { headline: "Celtics BUZZER BEATER", expected: true, reason: "buzzer beater em maiúsculas" },
  { headline: "Celtics BUZZERBEATER", expected: true, reason: "buzzerbeater em maiúsculas" },
];

// Casos novos do regex em 6b77636. Todos devem dar true.
const roundTwo = [
  { headline: "Jayson Tatum's buzzer-beating jumper lifts Celtics over Nets in OT", expected: true, reason: "buzzer-beating com hífen e lifts … over" },
  { headline: "Jayson Tatum's buzzer beating jumper lifts Celtics over Nets in OT", expected: true, reason: "buzzer beating com espaço e lifts … over" },
  { headline: "Jayson Tatum's buzzerbeating jumper lifts Celtics over Nets in OT", expected: true, reason: "buzzerbeating junto e lifts … over" },
  { headline: "lifts Celtics over Nets", expected: true, reason: "lifts … over" },
  { headline: "carries Celtics over Nets", expected: true, reason: "carries … over" },
  { headline: "powers Celtics past Nets", expected: true, reason: "powers … past" },
  { headline: "Why the Celtics are 3-1", expected: true, reason: "are N-N com hífen" },
  { headline: "Why the Celtics are 3\u20131", expected: true, reason: "are N-N com en dash" },
  { headline: "Why the Celtics are 3\u20141", expected: true, reason: "are N-N com em dash" },
  { headline: "Celtics at 3-1", expected: true, reason: "at N-N" },
  { headline: "Celtics improve to 3-1", expected: true, reason: "improve to N-N" },
  { headline: "Celtics move to 3-1", expected: true, reason: "move to N-N" },
  { headline: "Boston Celtics outlast Brooklyn Nets in OT via Jayson Tatum buzzer-beater", expected: true, reason: "outlast e buzzer-beater" },
  { headline: "C's hold off", expected: true, reason: "hold off" },
  { headline: "held off", expected: true, reason: "held off" },
  { headline: "Boston rallies past Brooklyn", expected: true, reason: "rallies past" },
];

// Negativos óbvios que não podem casar. Se casarem, o teste fica vermelho.
const obviousNegatives = [
  { headline: "preview", expected: false, reason: "preview não pode casar" },
  { headline: "injury report", expected: false, reason: "injury report não pode casar" },
  { headline: "trade rumor", expected: false, reason: "trade rumor não pode casar" },
  { headline: "Game 3 tonight", expected: false, reason: "Game 3 tonight não pode casar" },
];

// Placar sem outro gatilho. 1336e3f cobre hífen, en dash, em dash, AP e dois-pontos.
const scoreFormats = [
  { headline: "118-107", expected: true, reason: "placar sozinho com hífen" },
  { headline: "118\u2013107", expected: true, reason: "placar sozinho com en dash" },
  { headline: "118\u2014107", expected: true, reason: "placar sozinho com em dash" },
  { headline: "Celtics 118, Knicks 107", expected: true, reason: "placar no formato AP" },
  { headline: "118:107", expected: true, reason: "placar com dois-pontos" },
  { headline: "50:189", expected: true, reason: "faixa 50–189: 50 à esquerda e 189 à direita" },
  { headline: "189:50", expected: true, reason: "faixa 50–189: 189 à esquerda e 50 à direita" },
  { headline: "Celtics 50, Knicks 189", expected: true, reason: "AP na faixa: 50 à esquerda e 189 à direita" },
  { headline: "Celtics 189, Knicks 50", expected: true, reason: "AP na faixa: 189 à esquerda e 50 à direita" },
];

// Fora da faixa 50–189 o placar com : ou AP não é resultado. 3:45 parece horário.
const scoreBandEdges = [
  { headline: "49:107", expected: false, reason: "49 à esquerda fica fora da faixa" },
  { headline: "107:49", expected: false, reason: "49 à direita fica fora da faixa" },
  { headline: "190:107", expected: false, reason: "190 à esquerda fica fora da faixa" },
  { headline: "107:190", expected: false, reason: "190 à direita fica fora da faixa" },
  { headline: "3:45", expected: false, reason: "3:45 parece horário e fica fora da faixa" },
  { headline: "Celtics 49, Knicks 107", expected: false, reason: "AP com 49 à esquerda" },
  { headline: "Celtics 107, Knicks 49", expected: false, reason: "AP com 49 à direita" },
  { headline: "Celtics 190, Knicks 107", expected: false, reason: "AP com 190 à esquerda" },
  { headline: "Celtics 107, Knicks 190", expected: false, reason: "AP com 190 à direita" },
];

// Só a alternativa leads/trails series. Sem número, para não cair no placar de série.
const seriesTriggers = [
  { headline: "Celtics lead the series", expected: true, reason: "só lead the series" },
  { headline: "Knicks trail series", expected: true, reason: "só trail series" },
];

// Uma forma por verbo novo. A manchete não traz outro gatilho.
const newVerbForms = [
  { headline: "Celtics carry past Nets", expected: true, reason: "só carry … past" },
  { headline: "Celtics carried past Nets", expected: true, reason: "só carried … past" },
  { headline: "Brown powered past the Nets", expected: true, reason: "só powered … past" },
  { headline: "Celtics improves to 3-1", expected: true, reason: "só improves to N-N" },
  { headline: "Celtics improved to 4-2", expected: true, reason: "só improved to N-N" },
  { headline: "Boston moves to 5-2", expected: true, reason: "só moves to N-N" },
  { headline: "Boston moved to 6-3", expected: true, reason: "só moved to N-N" },
  { headline: "Knicks falls to the Pacers", expected: true, reason: "só falls to" },
];

// Palavras que contêm um gatilho. O \b tem de mantê-las fora.
const boundaryNegatives = [
  { headline: "that 3-1", expected: false, reason: "that contém at" },
  { headline: "flat 2-1", expected: false, reason: "flat contém at" },
  { headline: "care 4-1", expected: false, reason: "care contém are" },
  { headline: "Celtics stop the skid", expected: false, reason: "stop contém top" },
  { headline: "Celtics take the route", expected: false, reason: "route contém rout" },
  { headline: "swing through practice", expected: false, reason: "swing contém win" },
  { headline: "pledge of effort", expected: false, reason: "pledge contém edge" },
  { headline: "finally tonight", expected: false, reason: "finally contém final" },
  { headline: "semifinal preview", expected: false, reason: "semifinal contém final" },
  { headline: "stunt in warmups", expected: false, reason: "stunt contém stun" },
  { headline: "sinking feeling", expected: false, reason: "sinking contém sink" },
  { headline: "downtown parade", expected: false, reason: "downtown contém down" },
  { headline: "upbeat preview", expected: false, reason: "upbeat contém beat" },
  { headline: "beating the trap", expected: false, reason: "beating contém beat" },
  { headline: "topic of the day", expected: false, reason: "topic contém top" },
  { headline: "winter camp", expected: false, reason: "winter contém win" },
  { headline: "heartbeat of the team", expected: false, reason: "heartbeat contém beat" },
  { headline: "floss routine", expected: false, reason: "floss contém loss" },
];

// a31986e: victory/win over, N-N start, box scores, push past. O lookahead deixa o decimal de fora.
const roundThree = [
  { headline: "Karl-Anthony Towns, Knicks avert 0-4 start with victory over Pistons", expected: true, reason: "0-4 start e victory over" },
  { headline: "victory over", expected: true, reason: "só victory over" },
  { headline: "win over", expected: true, reason: "só win over" },
  { headline: "0-4 start", expected: true, reason: "N-N start com hífen" },
  { headline: "0\u20134 start", expected: true, reason: "N-N start com en dash" },
  { headline: "box scores", expected: true, reason: "box scores no plural" },
  { headline: "push past", expected: true, reason: "só push past" },
  { headline: "pushes the ball past", expected: true, reason: "só pushes … past" },
  { headline: "pushed Boston past", expected: true, reason: "só pushed … past" },
  { headline: "Oct. 28 - 95.7 WDAE", expected: false, reason: "28 - 95.7 é decimal, não placar" },
];

const cases = [...acceptedPrice, ...devTable, ...devScripts, ...criterionSpellings, ...roundTwo, ...scoreFormats, ...scoreBandEdges, ...seriesTriggers, ...newVerbForms, ...roundThree, ...obviousNegatives, ...boundaryNegatives];
const seen = new Set();
for (const row of cases) {
  assert.equal(seen.has(row.headline), false, `duplicate headline: ${row.headline}`);
  seen.add(row.headline);
}

describe("regex", () => {
  for (const row of cases) {
    test(row.headline, async () => {
      const item = await classify(row.headline);
      assert.equal(item.title, row.headline, row.reason);
      assert.equal(item.isSpoiler, row.expected, row.reason);
      assert.equal(item.safeTitle, row.expected ? "Spoiler-protected headline from ESPN" : row.headline, row.reason);
    });
  }
});
