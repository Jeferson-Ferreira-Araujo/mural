// node --experimental-strip-types scripts/test-promessas-dia.mjs
import { readFileSync } from "node:fs";
import { dayNumber, promiseIndex, msUntilMidnight } from "../src/lib/promessasDia.ts";
const N = JSON.parse(readFileSync(new URL("../src/data/promessas.json", import.meta.url), "utf8")).length;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error("FALHOU: " + m); } };
// São Paulo = UTC-3 (sem horário de verão desde 2019): 00:00 em SP = 03:00Z
const sp = (y, mo, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(Date.UTC(y, mo - 1, d, h + 3, mi, s, ms));
const idx = (dt) => promiseIndex(dt, N);

// 1) permanece o mesmo o dia todo e troca na virada
for (const [y, mo, d] of [[2026, 10, 10], [2026, 12, 31], [2028, 2, 28], [2028, 2, 29], [2027, 3, 1]]) {
  const first = idx(sp(y, mo, d, 0, 0, 0));
  for (const t of [[0, 0, 1], [6, 30], [12], [18, 45], [23, 59, 59, 999]]) ok(idx(sp(y, mo, d, ...t)) === first, `mudou durante o dia ${y}-${mo}-${d} ${t}`);
  const before = idx(sp(y, mo, d - 1 || 1, 23, 59, 59, 999));
  if (d > 1) ok(idx(sp(y, mo, d, 0, 0, 0)) === (before + 1) % N, `não avançou à meia-noite em ${y}-${mo}-${d}`);
}
// 2) o instante antes e depois da meia-noite (em UTC, 02:59:59.999Z → 03:00:00Z)
ok(idx(new Date("2026-10-11T02:59:59.999Z")) !== idx(new Date("2026-10-11T03:00:00.000Z")), "virada às 00:00 de SP");
ok(idx(new Date("2026-10-11T03:00:00.000Z")) === idx(new Date("2026-10-11T23:59:59.999Z")) , "dia inteiro igual até 23:59:59 de SP");
// 3) sem repetição em qualquer janela de 366 dias, incluindo bissexto (2028) e virada de ano
for (const start of [sp(2026, 1, 1), sp(2027, 1, 1), sp(2027, 7, 15), sp(2028, 1, 1), sp(2028, 2, 29), sp(2028, 12, 31)]) {
  const seen = new Set();
  for (let i = 0; i < 366; i++) { const k = idx(new Date(start.getTime() + i * 86_400_000)); ok(!seen.has(k), `repetição na janela de 366 dias a partir de ${start.toISOString()}`); seen.add(k); }
}
// 4) ano de 2028 inteiro (366 dias) e 2027 (365): todos distintos
for (const [y, days] of [[2027, 365], [2028, 366]]) {
  const s = new Set(); for (let i = 0; i < days; i++) s.add(idx(new Date(sp(y, 1, 1).getTime() + i * 86_400_000)));
  ok(s.size === days, `ano ${y} tem repetição (${s.size}/${days})`);
}
// 5) 29/02 é um dia comum: segue a sequência sem pular
ok(idx(sp(2028, 2, 29)) === (idx(sp(2028, 2, 28)) + 1) % N && idx(sp(2028, 3, 1)) === (idx(sp(2028, 2, 29)) + 1) % N, "29/02 deve ser só o próximo da sequência");
// 6) ciclo reinicia após N dias e sequência é função só da data (mesmo resultado em qualquer fuso do aparelho)
ok(idx(sp(2026, 1, 1)) === 0 && idx(sp(2026, 1, 1 + N)) === 0 || idx(new Date(sp(2026, 1, 1).getTime() + N * 86_400_000)) === 0, "ciclo não reinicia após N dias");
ok(dayNumber(sp(2026, 1, 1)) === 0 && dayNumber(sp(2025, 12, 31)) === -1, "contagem de dias");
ok(idx(sp(2025, 12, 31)) === N - 1, "antes da época (negativo) deve cair no fim da lista");
// 7) tempo até a meia-noite
ok(msUntilMidnight(sp(2026, 10, 10, 23, 59, 59, 0)) === 1000, "faltando 1 s");
ok(msUntilMidnight(sp(2026, 10, 10, 0, 0, 0, 0)) === 86_400_000, "meia-noite exata = 24 h até a próxima");
ok(msUntilMidnight(sp(2026, 10, 10, 12, 0, 0, 0)) === 43_200_000, "meio-dia = 12 h");
console.log(fails ? `${fails} falha(s)` : `OK: ${N} promessas; troca à meia-noite de SP, estável no dia, sem repetição em 366 dias, virada de ano e bissexto ok.`);
process.exit(fails ? 1 : 0);
