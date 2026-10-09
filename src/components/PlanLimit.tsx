"use client";

import { useState } from "react";
import { PAYMENTS_ENABLED, PLANS } from "@/lib/plans";
import { startCheckout } from "@/lib/payments";
import { Modal } from "./account/Modal";

/**
 * Plano FREE, no próprio mural: contador de pins (ex.: 3/15) com um "?" que explica o limite e leva à assinatura do PINZ+.
 * `glass`: sobre o quadro (celular); sem ele: pílula clara (desktop).
 */
export function PlanLimit({ used, glass = false, className = "" }: { used: number; glass?: boolean; className?: string }) {
  const max = PLANS.free.slots;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setErr(null);
    const e = await startCheckout("plus");
    if (e) {
      setErr(e);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${used} de ${max} pins usados. Saiba mais sobre o limite do plano`}
        className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${
          glass ? "bg-[#17110c]/85 text-white shadow-[0_0.3rem_0.9rem_rgba(0,0,0,.5)] backdrop-blur" : "bg-[#fbf6ea] text-[#2a1c12] shadow-[0_0.4rem_1.2rem_rgba(0,0,0,.3)] hover:bg-white"
        } ${className}`}
      >
        <span className="tabular-nums">
          {used}/{max}
        </span>
        <span aria-hidden className={`grid size-5 place-items-center rounded-full text-xs font-bold ${glass ? "bg-white/90 text-[#2a1c12]" : "bg-[#2a1c12] text-white"}`}>
          ?
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Limite do plano" label="Limite do plano">
        <div className="space-y-4 text-sm text-[#2f2218]">
          <p>
            Você está usando <strong>{used}</strong> de <strong>{max}</strong> pins do seu mural. Esse é o limite da conta <strong>FREE</strong>, que inclui 1 mural.
          </p>
          <div className="rounded-2xl border-2 border-[#e0b04a] bg-[#fff8e4] p-4">
            <p className="font-bold">Com o PINZ+ você tem:</p>
            <ul className="mt-2 space-y-1.5">
              {["Todos os 28 espaços em cada mural", "Até 10 murais", "Vídeo, voz e local nos pins", "Pins em segredo e mais Bottons"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="font-bold text-[#2f6a3c]">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          {err && (
            <p role="alert" className="text-[#a23b2a]">
              {err}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !PAYMENTS_ENABLED}
            onClick={() => void subscribe()}
            className="w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!PAYMENTS_ENABLED ? "PINZ+ em breve" : busy ? "Abrindo o pagamento…" : "Assinar o PINZ+ por R$ 9,90/mês"}
          </button>
          {PAYMENTS_ENABLED && <p className="text-center text-xs text-[#6b5440]">Cobrado todo mês no Mercado Pago · cancele quando quiser.</p>}
        </div>
      </Modal>
    </>
  );
}
