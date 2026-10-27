"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

/** Registra os erros de JavaScript que escapam do código (tela quebrada, promessa recusada). Não desenha nada. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => reportError("window", ev.error ?? ev.message);
    const onRejection = (ev: PromiseRejectionEvent) => reportError("promise", ev.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
