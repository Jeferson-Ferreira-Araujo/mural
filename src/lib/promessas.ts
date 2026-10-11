"use client";

import { useEffect, useState } from "react";
import data from "@/data/promessas.json";
import { msUntilMidnight, promiseIndex } from "./promessasDia";

export type Promessa = { promessa: string; referencia: string };

/** Biblioteca de promessas (Almeida 1911, texto literal), já na ordem do ciclo anual. Veja scripts/build-promessas.cjs. */
export const PROMESSAS: readonly Promessa[] = data;

/** A promessa de um dia (hoje, por padrão), no calendário de São Paulo. */
export const promessaDoDia = (now: Date = new Date()): Promessa => PROMESSAS[promiseIndex(now, PROMESSAS.length)];

/**
 * Hook: a promessa de hoje desde a primeira renderização, trocada sozinha à meia-noite de São Paulo com a tela aberta.
 * Só relógio local: nenhuma requisição. Ao voltar para a aba (ou acordar o aparelho) confere de novo.
 */
export function usePromessaDoDia(): Promessa {
  const [p, setP] = useState<Promessa>(() => promessaDoDia());
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      const next = promessaDoDia();
      setP((cur) => (cur.referencia === next.referencia ? cur : next));
    };
    const arm = () => {
      window.clearTimeout(timer);
      // acorda um instante depois da virada; em esperas longas, confere a cada hora por segurança
      timer = window.setTimeout(() => {
        sync();
        arm();
      }, Math.min(msUntilMidnight() + 300, 3_600_000));
    };
    const wake = () => {
      sync();
      arm();
    };
    wake();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, []);
  return p;
}
