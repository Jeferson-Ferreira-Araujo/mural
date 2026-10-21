"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Aviso curto e discreto (somente aria-live, sem interação).
 * Fica no pé da tela; se a barra de bottons está à vista, o aviso sobe para logo ACIMA dela (nunca por cima dos bottons).
 */
export function Toast({ message }: { message: string | null }) {
  const [bottom, setBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!message) return;
    const bar = [...document.querySelectorAll<HTMLElement>("[data-badge-bar]")].find((el) => el.getBoundingClientRect().width > 0 && el.offsetParent !== null);
    setBottom(bar ? Math.max(0, window.innerHeight - bar.getBoundingClientRect().top) + 12 : null);
  }, [message]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4" style={bottom !== null ? { bottom } : undefined}>
      {message && (
        <p className="rise rounded-xl bg-[#1f232b] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0.5rem_1.5rem_rgba(0,0,0,.4)]">
          {message}
        </p>
      )}
    </div>
  );
}
