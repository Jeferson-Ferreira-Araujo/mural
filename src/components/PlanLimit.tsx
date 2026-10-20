"use client";

import { useState } from "react";
import { PAYMENTS_ENABLED, PLANS } from "@/lib/plans";
import { PAY_EVENT } from "@/lib/payments";
import { isDisplayKey } from "@/lib/badges";
import { useBadges } from "./badges/BadgeContext";
import { Modal } from "./account/Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Plano FREE, no próprio mural: contador de pins (ex.: 3/15) com um "?" que explica o limite e leva à assinatura do PINZ+.
 * `glass`: sobre o quadro (celular); sem ele: pílula clara (desktop).
 */
export function PlanLimit({ used: pins, glass = false, className = "" }: { used: number; glass?: boolean; className?: string }) {
  const tl = useLit();
  const tx = useTranslations("components.PlanLimit");
  const max = PLANS.free.slots;
  const { badges } = useBadges();
  const used = pins + badges.filter((b) => b.kind === "display" || isDisplayKey(b.key)).length; // o limite do gratuito conta pins e displays
  const [open, setOpen] = useState(false);

  function subscribe() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: "plus" } })); // a janela de assinatura (cartão) abre no próprio Pinz
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tx("x_usedAria", { used, max })}
        className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${
          glass ? "bg-[#17110c]/85 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur" : "bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white"
        } ${className}`}
      >
        <span className="tabular-nums">
          {used}/{max}
        </span>
        <span aria-hidden className={`grid size-4 place-items-center rounded-full text-[10px] leading-none font-bold ${glass ? "bg-white/90 text-[#2a1c12]" : "bg-[#2a1c12] text-white"}`}>
          ?
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={tx("limiteDoPlano")} label={tx("limiteDoPlano")}>
        <div className="space-y-4 text-sm text-[#2f2218]">
          <p>
            {tx.rich("x_voceEstaUsandoDePins", { v0: used, v1: max, s0: (c) => <strong>{c}</strong>, s1: (c) => <strong>{c}</strong>, s2: (c) => <strong>{c}</strong> })}</p>
          <div className="rounded-2xl border-2 border-[#e0b04a] bg-[#fff8e4] p-4">
            <p className="font-bold">{tx("comOPinzVoceTem")}</p>
            <ul className="mt-2 space-y-1.5">
              {[tl("Pins e displays sem limite"), tl("Até 10 murais"), tl("Vídeo, voz e local nos pins"), tl("Pins em segredo e mais Bottons")].map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="font-bold text-[#2f6a3c]">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            disabled={!PAYMENTS_ENABLED}
            onClick={subscribe}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-b from-[#ffd75e] to-[#f5a50f] px-4 py-3 text-sm font-extrabold text-[#2a1c12] shadow-[0_0.2rem_0.7rem_rgba(150,90,0,.35),inset_0_1px_0_rgba(255,255,255,.55)] ring-1 ring-[#e39a0b]/60 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!PAYMENTS_ENABLED ? tl("PINZ+ em breve") : tx("m_assinarOPinzPorR")}
          </button>
        </div>
      </Modal>
    </>
  );
}
