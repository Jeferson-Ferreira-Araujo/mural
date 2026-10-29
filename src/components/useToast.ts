"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Aviso curto (toast): `message` para renderizar e `notify` para disparar. */
export function useToast(ms = 2800) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback(
    (msg: string) => {
      setMessage(msg);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  // qualquer componente pode pedir um aviso: window.dispatchEvent(new CustomEvent("pinz:notify", { detail: "texto" }))
  useEffect(() => {
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string" && text) notify(text);
    };
    window.addEventListener("pinz:notify", on);
    return () => window.removeEventListener("pinz:notify", on);
  }, [notify]);

  return { message, notify };
}
