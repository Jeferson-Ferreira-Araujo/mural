"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { FRASES } from "@/data/frasesLibs";
import { msUntilMidnight, promiseIndex } from "./promessasDia";

/** A frase motivacional de um dia (hoje, por padrão): 365 por idioma, na mesma ordem, trocadas à meia-noite de São Paulo. Idiomas sem biblioteca usam o inglês. */
export const fraseDoDia = (now: Date = new Date(), locale = "pt"): string => {
  const lib = FRASES[locale] ?? FRASES.en;
  return lib[promiseIndex(now, lib.length)];
};

/** Hook: a frase de hoje, trocada sozinha à meia-noite com a tela aberta (só relógio local, sem rede). */
export function useFraseDoDia(): string {
  const locale = useLocale();
  const [f, setF] = useState(() => fraseDoDia(new Date(), locale));
  useEffect(() => {
    let timer = 0;
    const sync = () => setF(fraseDoDia(new Date(), locale));
    const arm = () => {
      window.clearTimeout(timer);
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
  return f;
}
