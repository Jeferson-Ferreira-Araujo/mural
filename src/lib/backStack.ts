"use client";

import { useEffect, useRef } from "react";

/**
 * Botão "voltar" (Android e navegadores) para janelas e etapas: cada janela aberta empilha uma entrada no histórico, e voltar fecha só a de cima
 * (uma etapa da Loja, depois a Loja, depois…) em vez de sair da página do mural. Fechar pelo X desempilha a entrada sozinho.
 */
type Entry = { close: () => void };

const stack: Entry[] = [];
let ignore = 0; // popstates provocados por nós (desempilhar) e que não devem fechar nada
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("popstate", () => {
    if (ignore > 0) {
      ignore--;
      return;
    }
    const top = stack.pop();
    top?.close();
  });
}

/** Empilha uma entrada. Devolve a função que a desempilha (quando a janela fecha por conta própria). */
export function pushBack(close: () => void): () => void {
  install();
  const e: Entry = { close };
  stack.push(e);
  try {
    window.history.pushState({ pinzBack: stack.length }, "");
  } catch {
    /* sem histórico: a janela só não responde ao voltar */
  }
  return () => {
    const i = stack.indexOf(e);
    if (i < 0) return; // já saiu (o voltar fechou esta janela)
    const gone = stack.splice(i); // esta e as de cima (as de cima também estão fechando)
    ignore++;
    try {
      window.history.go(-gone.length);
    } catch {
      ignore--;
    }
  };
}

/** Enquanto `active`, o botão voltar fecha esta janela (chama `close`). */
export function useBackClose(active: boolean, close: () => void) {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!active) return;
    return pushBack(() => ref.current());
  }, [active]);
}
