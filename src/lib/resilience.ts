/**
 * Chamadas a serviços de fora (verificador de imagens, Mercado Pago, clima…) com três proteções:
 *  - timeout em cada tentativa;
 *  - novas tentativas com espera crescente (backoff exponencial com sorteio, para vários pedidos não baterem juntos);
 *  - disjuntor (circuit breaker) por serviço: depois de falhas seguidas, fica "aberto" por um tempo e responde na hora com erro,
 *    em vez de empilhar pedidos num serviço que caiu. Passado o tempo, deixa passar uma tentativa de teste.
 * O estado fica na memória do processo (o site roda em uma instância só).
 */

type Breaker = { fails: number; openUntil: number; probing: boolean };
const breakers = new Map<string, Breaker>();

const BREAKER_FAILS = 5; // falhas seguidas para abrir
const BREAKER_OPEN_MS = 30_000; // quanto tempo fica aberto

export class CircuitOpenError extends Error {
  constructor(public service: string) {
    super(`circuit_open:${service}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera antes da tentativa `n` (0, 1, 2…): 300 ms, 600 ms, 1,2 s… com até 30% de sorteio, no máximo 4 s. */
export const backoffMs = (n: number) => Math.min(4000, 300 * 2 ** n) * (0.85 + Math.random() * 0.3);

const retryableStatus = (s: number) => s === 408 || s === 425 || s === 429 || s >= 500;

function allow(service: string): boolean {
  const b = breakers.get(service);
  if (!b || b.openUntil === 0) return true;
  if (Date.now() < b.openUntil) return false;
  if (b.probing) return false; // já tem uma tentativa de teste em andamento
  b.probing = true;
  return true;
}
function record(service: string, ok: boolean) {
  const b = breakers.get(service) ?? { fails: 0, openUntil: 0, probing: false };
  b.probing = false;
  if (ok) {
    b.fails = 0;
    b.openUntil = 0;
  } else if (++b.fails >= BREAKER_FAILS) b.openUntil = Date.now() + BREAKER_OPEN_MS;
  breakers.set(service, b);
}

export type ResilientOptions = {
  /** nome do serviço (um disjuntor por nome) */
  service: string;
  /** tempo máximo de cada tentativa */
  timeoutMs: number;
  /** quantas novas tentativas depois da primeira (padrão 2) */
  retries?: number;
  /** só repita se o pedido puder ser repetido sem efeito duplicado (GET, ou POST com chave de idempotência) */
  idempotent?: boolean;
};

/** fetch com timeout, novas tentativas e disjuntor. Respostas 4xx (exceto 408/425/429) voltam normalmente e NÃO contam como falha do serviço. */
export async function resilientFetch(url: string, init: RequestInit, opt: ResilientOptions): Promise<Response> {
  const retries = opt.idempotent === false ? 0 : (opt.retries ?? 2);
  let lastErr: unknown;
  for (let n = 0; n <= retries; n++) {
    if (!allow(opt.service)) throw new CircuitOpenError(opt.service);
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(opt.timeoutMs) });
      if (retryableStatus(res.status)) {
        record(opt.service, false);
        if (n < retries) {
          await res.body?.cancel().catch(() => undefined);
          await sleep(backoffMs(n));
          continue;
        }
        return res;
      }
      record(opt.service, true);
      return res;
    } catch (e) {
      lastErr = e;
      record(opt.service, false);
      if (n < retries) await sleep(backoffMs(n));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch_failed");
}
