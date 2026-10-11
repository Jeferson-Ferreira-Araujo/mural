"use client";

import { useEffect } from "react";

/** Registra o service worker do app instalável (só em produção, para o modo de desenvolvimento não guardar arquivos antigos). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const reg = () => void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);
  return null;
}
