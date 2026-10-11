"use client";

import { useCallback, useEffect, useState } from "react";

/** Instalar o Pinz como app (PWA). O Chrome/Edge entregam um pedido de instalação (beforeinstallprompt); o iPhone/iPad não: lá é "Adicionar à Tela de Início". */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

/** Chamado uma vez, bem cedo (PwaRegister): o navegador só avisa uma vez, então o pedido é guardado até alguém querer instalar. */
export function captureInstallPrompt(): () => void {
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export type InstallState = {
  /** o navegador sabe instalar com um toque */
  native: boolean;
  /** iPhone/iPad (Safari): instalar é um passo manual */
  ios: boolean;
  /** já está rodando como app instalado */
  installed: boolean;
  /** pede a instalação ao navegador (só quando `native`) */
  install: () => Promise<boolean>;
};

export function useInstall(): InstallState {
  const [state, setState] = useState({ native: false, ios: false, installed: false });
  useEffect(() => {
    const sync = () => setState({ native: !!deferred, ios: isIos(), installed: isStandalone() });
    sync();
    subs.add(sync);
    return () => void subs.delete(sync);
  }, []);
  const install = useCallback(async () => {
    const ev = deferred;
    if (!ev) return false;
    deferred = null; // o pedido só vale uma vez
    notify();
    try {
      await ev.prompt();
      return (await ev.userChoice).outcome === "accepted";
    } catch {
      return false;
    }
  }, []);
  return { ...state, install };
}
