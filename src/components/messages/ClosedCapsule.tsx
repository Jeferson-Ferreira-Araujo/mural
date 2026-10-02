"use client";

import { useEffect, useState } from "react";
import { formatCountdown, remainingMs } from "@/lib/capsule";
import { Pin } from "./fasteners";

/**
 * Cápsula PINZ ainda fechada: um envelope lacrado com a contagem regressiva.
 * Só recebe a data de abertura — o conteúdo nem existe aqui (veja `ClosedCapsuleItem`).
 */
export function ClosedCapsule({ opensAt }: { opensAt: string }) {
  // a contagem só roda no navegador (evita diferença entre servidor e cliente)
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLeft(formatCountdown(remainingMs(opensAt)));
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [opensAt]);

  return (
    <article
      aria-label="Cápsula PINZ fechada"
      className="paper-grain shadow-paper relative h-[13.5em] w-[14em] overflow-hidden bg-[#ecdcb6]"
      style={{ borderRadius: "0.25em" }}
    >
      {/* aba do envelope */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[6.4em] bg-[#dcc58f]" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <span aria-hidden className="absolute inset-x-0 top-0 h-[6.4em] opacity-40" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(180deg, rgba(255,255,255,.5), transparent 60%)" }} />
      <Pin tone="blue" className="top-[0.55em] left-[1.1em]" />

      {/* lacre de cera */}
      <span
        aria-hidden
        className="absolute top-[4.9em] left-1/2 z-10 grid size-[2.9em] -translate-x-1/2 place-items-center rounded-full text-white shadow-[0_0.2em_0.5em_rgba(60,10,5,.55)]"
        style={{ background: "radial-gradient(circle at 35% 30%, #e8554a, #a31d16 70%)" }}
      >
        <svg viewBox="0 0 24 24" className="size-[1.2em]" fill="currentColor">
          <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
        </svg>
      </span>

      <div className="absolute inset-x-0 bottom-0 px-[1em] pb-[0.9em] text-center">
        <p className="font-hand text-[1.4em] leading-[1.05] text-[#3b2a14]">Você recebeu uma mensagem fechada.</p>
        <p className="mt-[0.5em] font-mono text-[0.72em] leading-snug text-[#5a4527]" aria-live="off">
          Abre em: {left ?? "…"}
        </p>
      </div>
    </article>
  );
}
