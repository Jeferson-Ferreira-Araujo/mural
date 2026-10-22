"use client";

import { useEffect, useState } from "react";
import data from "@/data/promessas.json";
import dataEn from "@/data/promessas.en.json";
import dataEs from "@/data/promessas.es.json";
import { useLocale } from "next-intl";
import { msUntilMidnight, promiseIndex } from "./promessasDia";

export type Promessa = { promessa: string; referencia: string };

/** Biblioteca de promessas (Almeida Revista e Atualizada, texto literal), já na ordem do ciclo anual. Veja scripts/build-promessas.cjs. */
export const PROMESSAS: readonly Promessa[] = data;

/** A promessa de um dia (hoje, por padrão), no calendário de São Paulo. */
/** A mesma biblioteca em cada idioma (ARA em português, New Heart English Bible, Reina-Valera 1909): mesma ordem e mesmas referências, então o versículo do dia é o mesmo em qualquer idioma. */
const LIBS: Record<string, readonly Promessa[]> = { pt: PROMESSAS, en: dataEn, es: dataEs };
export const promessaDoDia = (now: Date = new Date(), locale = "pt"): Promessa => {
  const lib = LIBS[locale] ?? dataEn; // idiomas sem biblioteca própria usam a inglesa
  return lib[promiseIndex(now, lib.length)];
};

/**
 * Hook: a promessa de hoje desde a primeira renderização, trocada sozinha à meia-noite de São Paulo com a tela aberta.
 * Só relógio local: nenhuma requisição. Ao voltar para a aba (ou acordar o aparelho) confere de novo.
 */
export function usePromessaDoDia(): Promessa {
  const locale = useLocale();
  const [p, setP] = useState<Promessa>(() => promessaDoDia(new Date(), locale));
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      const next = promessaDoDia(new Date(), locale);
      setP((cur) => (cur.referencia === next.referencia && cur.promessa === next.promessa ? cur : next));
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
  }, [locale]);
  return p;
}
