"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CAPSULE_ENABLED, CREDIT_PACKS, NEW_MURAL_COST, PAYMENTS_ENABLED, PLANS, type PlanId } from "@/lib/plans";
import { cancelSubscription, fetchSubscription, startCheckout, type Subscription } from "@/lib/payments";
import { PlanBadge } from "../board/PlanBadge";
import { Carousel } from "./Carousel";
import { Modal } from "./Modal";

const FEATURES: Record<PlanId, { text: string; on: boolean }[]> = {
  free: [
    { text: "1 mural", on: true },
    { text: "15 espaços no mural", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "10 Bottons (1 unidade de cada)", on: true },
    { text: "Música, vídeo, voz e local", on: false },
    { text: "Cápsulas PINZ (abrem numa data)", on: false },
    { text: "Deixar pins específicos em segredo", on: false },
    { text: "Comprar pins e temas na loja com créditos", on: true },
    { text: "Mais de um mural", on: false },
  ],
  full: [
    { text: "Mais de um mural (comprando com créditos)", on: true },
    { text: "28 espaços em cada mural", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "25 Bottons (1 unidade de cada)", on: true },
    { text: "Música, vídeo, voz e local", on: true },
    { text: "Cápsulas PINZ (abrem numa data)", on: true },
    { text: "Deixar pins específicos em segredo", on: true },
    { text: "Pins e temas da loja, com créditos", on: true },
  ],
};

function PlanCard({ id, current, footer }: { id: PlanId; current: boolean; footer?: ReactNode }) {
  const p = PLANS[id];
  const full = id === "full";
  return (
    <article className={`rounded-2xl border-2 p-5 ${full ? "border-[#e0b04a] bg-[#fff8e4]" : "border-[#d9c9ad] bg-white/70"}`}>
      <header className="flex items-center justify-between gap-2">
        <PlanBadge plan={id} />
        {current && <span className="rounded-lg bg-[#1f232b] px-2.5 py-1 text-[11px] font-bold text-white">Seu plano</span>}
      </header>
      <p className="font-title mt-3 text-3xl font-semibold">{p.price}</p>
      <p className="text-sm text-[#6b5440]">{full ? (PAYMENTS_ENABLED ? "Cobrado todo mês no Mercado Pago · cancele quando quiser" : "Cobrança em breve") : "Para sempre"}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {FEATURES[id].filter((f) => CAPSULE_ENABLED || !f.text.startsWith("Cápsulas")).map((f) => (
          <li key={f.text} className={`flex items-start gap-2 ${f.on ? "text-[#2f2218]" : "text-[#8a7b69]"}`}>
            <span aria-hidden className={`mt-0.5 font-bold ${f.on ? "text-[#2f6a3c]" : "text-[#b0a08a]"}`}>
              {f.on ? "✓" : "–"}
            </span>
            <span className={f.on ? "" : "line-through decoration-[#c9b68f]"}>{f.text}</span>
            {!f.on && <span className="sr-only"> (não incluso)</span>}
          </li>
        ))}
      </ul>
      {footer}
    </article>
  );
}

const btn = "mt-4 w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-50";
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

/** Planos em carrossel: o que cada um custa e inclui; com a cobrança ligada, também assina o PLUS e compra créditos. */
export function PlansModal({ open, onClose, plan, credits }: { open: boolean; onClose: () => void; plan: PlanId; credits: number }) {
  const [sub, setSub] = useState<Subscription>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && PAYMENTS_ENABLED) void fetchSubscription().then(setSub);
  }, [open]);

  async function buy(product: string) {
    setBusy(product);
    setMsg(null);
    const err = await startCheckout(product);
    if (err) {
      setMsg(err);
      setBusy(null);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancelar a assinatura PLUS? Você continua com o PLUS até o fim do período já pago.")) return;
    setBusy("cancel");
    setMsg((await cancelSubscription()) ? "Assinatura cancelada. O PLUS continua até o fim do período pago." : "Não foi possível cancelar agora. Tente de novo.");
    setSub(await fetchSubscription());
    setBusy(null);
  }

  const subscribed = sub?.status === "authorized";
  const plusFooter = !PAYMENTS_ENABLED ? undefined : subscribed ? (
    <div className="mt-4 text-sm">
      <p className="font-semibold text-[#2f6a3c]">Assinatura ativa{sub?.paidUntil ? ` · renova por volta de ${fmtDate(sub.paidUntil)}` : ""}</p>
      <button type="button" disabled={busy !== null} onClick={() => void cancel()} className="mt-2 cursor-pointer text-xs font-semibold text-[#a23b2a] underline disabled:opacity-50">
        {busy === "cancel" ? "Cancelando…" : "Cancelar assinatura"}
      </button>
    </div>
  ) : sub?.status === "cancelled" && sub.active ? (
    <p className="mt-4 text-sm font-semibold text-[#6b5440]">Assinatura cancelada · PLUS até {fmtDate(sub.paidUntil)}</p>
  ) : plan === "free" ? (
    <button type="button" disabled={busy !== null} onClick={() => void buy("plus")} className={btn}>
      {busy === "plus" ? "Abrindo o pagamento…" : "Assinar o PLUS por R$ 9,90/mês"}
    </button>
  ) : undefined;

  return (
    <Modal open={open} onClose={onClose} title="Planos">
      <p className="mb-4 text-center text-sm text-[#6b5440]">Quem visita o seu mural nunca paga: os limites valem só para você, dono do mural.</p>
      <Carousel label="Planos">
        <PlanCard id="free" current={plan === "free"} />
        <PlanCard id="full" current={plan === "full"} footer={plusFooter} />
      </Carousel>
      {msg && (
        <p role="status" className="mt-3 text-center text-sm font-semibold text-[#4a3826]">
          {msg}
        </p>
      )}
      <div className="mt-5 rounded-2xl border border-[#e1d3ba] bg-white/50 p-4">
        <h3 className="text-sm font-bold">
          Créditos <span className="font-normal text-[#8a7b69]">· {PAYMENTS_ENABLED ? "" : "em breve · "}você tem {credits}</span>
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CREDIT_PACKS.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border border-[#d9c9ad] bg-[#f3ead8] px-3 py-1 text-sm">
              <span>
                <strong>{c.credits}</strong> créditos · {c.price}
              </span>
              {PAYMENTS_ENABLED && (
                <button type="button" disabled={busy !== null} onClick={() => void buy(`credits:${c.id}`)} className="cursor-pointer rounded-md bg-[#d9a21b] px-2 py-0.5 text-xs font-bold text-[#2a1c12] hover:bg-[#e6ae22] disabled:opacity-50">
                  {busy === `credits:${c.id}` ? "…" : "Comprar"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[#6b5440]">Um novo mural custa {NEW_MURAL_COST} créditos.</p>
      </div>
    </Modal>
  );
}
