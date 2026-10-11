/**
 * Promessa do dia: regra pura (sem dados, sem React), para valer igual no servidor, no navegador e nos testes.
 * - O "dia" é o dia do calendário em America/Sao_Paulo; vira à meia-noite de lá, para todo mundo ao mesmo tempo.
 * - A promessa vem da posição (dias desde 01/01/2026) módulo o tamanho da lista: sem sorteio, sem pedir nada à rede.
 * - 29 de fevereiro é um dia comum da contagem (entra a próxima promessa, nada é pulado nem repetido). Com a lista maior
 *   que 366, nenhuma promessa se repete em qualquer janela de 366 dias; ao esgotar a lista, a sequência recomeça.
 */
export const PROMISE_TZ = "America/Sao_Paulo";
const EPOCH_DAY = Date.UTC(2026, 0, 1) / 86_400_000;

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

function partsInSP(now: Date): Parts {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: PROMISE_TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(now)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
}

/** Dias inteiros desde 01/01/2026 no calendário de São Paulo (negativo antes disso). */
export function dayNumber(now: Date = new Date()): number {
  const p = partsInSP(now);
  return Date.UTC(p.y, p.m - 1, p.d) / 86_400_000 - EPOCH_DAY;
}

/** Posição da promessa do dia numa lista de `size` itens. */
export function promiseIndex(now: Date, size: number): number {
  if (size <= 0) return 0;
  return ((dayNumber(now) % size) + size) % size;
}

/** Milissegundos até a próxima meia-noite de São Paulo (nunca menos de 1 s). */
export function msUntilMidnight(now: Date = new Date()): number {
  const p = partsInSP(now);
  const left = 86_400_000 - ((p.h * 60 + p.mi) * 60 + p.s) * 1000 - now.getMilliseconds();
  return Math.max(1000, left);
}
