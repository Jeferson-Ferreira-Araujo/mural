"use client";

import { useState } from "react";
import { PAYMENTS_ENABLED, PLANS } from "@/lib/plans";
import { PAY_EVENT } from "@/lib/payments";
import { isDisplayKey } from "@/lib/badges";
import { useBadges } from "./badges/BadgeContext";
import { Modal } from "./account/Modal";

/**
 * Plano FREE, no próprio mural: contador de pins (ex.: 3/15) com um "?" que explica o limite e leva à assinatura do PINZ+.
 * `glass`: sobre o quadro (celular); sem ele: pílula clara (desktop).
 */
export function PlanLimit({ used: pins, glass = false, className = "" }: { used: number; glass?: boolean; className?: string }) {
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
        aria-label={`${used} de ${max} itens usados. Saiba mais sobre o limite do plano`}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Limite do plano" label="Limite do plano">
        <div className="space-y-4 text-sm text-[#2f2218]">
          <p>
            Você está usando <strong>{used}</strong> de <strong>{max}</strong> pins e displays do seu mural. Esse é o limite da conta <strong>FREE</strong>, que inclui 1 mural.
          </p>
          <div className="rounded-2xl border-2 border-[#e0b04a] bg-[#fff8e4] p-4">
            <p className="font-bold">Com o PINZ+ você tem:</p>
            <ul className="mt-2 space-y-1.5">
              {["Pins e displays sem limite", "Até 10 murais", "Vídeo, voz e local nos pins", "Pins em segredo e mais Bottons"].map((t) => (
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
            className="w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!PAYMENTS_ENABLED ? "PINZ+ em breve" : "Assinar o PINZ+ por R$ 9,90/mês"}
          </button>
        </div>
      </Modal>
    </>
  );
}
