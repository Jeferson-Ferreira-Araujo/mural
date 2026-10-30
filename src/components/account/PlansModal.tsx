"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CAPSULE_ENABLED, CREDIT_PACKS, PAYMENTS_ENABLED, PLANS, PLUS_PRICE_CENTS, type PlanId } from "@/lib/plans";
import { cancelSubscription, fetchSubscription, PAY_EVENT, startCheckout, type Subscription } from "@/lib/payments";
import { PlanBadge } from "../board/PlanBadge";
import { Carousel } from "./Carousel";
import { Modal } from "./Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useTag } from "@/i18n/useTag";
import { useMoney } from "@/lib/useMoney";

export const FEATURES: Record<PlanId, { text: string; on: boolean }[]> = {
  free: [
    { text: "1 mural", on: true },
    { text: "Pins e displays sem limite", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "25 Bottons (1 unidade de cada)", on: true },
    { text: "Seu mural recebe pins de desenho, música, vídeo, voz e local", on: false },
    { text: "Bottons novos da loja liberados para compra", on: false },
    { text: "Cápsulas PINZ (abrem numa data)", on: false },
    { text: "Deixar pins e displays em segredo", on: true },
    { text: "Comprar pins e temas na loja com créditos", on: true },
    { text: "Mais de um mural", on: false },
  ],
  full: [
    { text: "Até 10 murais", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "Bottons novos da loja liberados para compra", on: true },
    { text: "Seu mural recebe pins de desenho, música, vídeo, voz e local", on: true },
    { text: "Cápsulas PINZ (abrem numa data)", on: true },
    { text: "Pins e temas da loja, com créditos", on: true },
  ],
};

function PlanCard({ id, current, footer }: { id: PlanId; current: boolean; footer?: ReactNode }) {
  const tx = useTranslations("components.account.PlansModal");
  const tl = useLit();
  const money = useMoney();
  const p = PLANS[id];
  const full = id === "full";
  return (
    <article className={`rounded-2xl border-2 p-5 ${full ? "border-[#e0b04a] bg-[#fff8e4]" : "border-[#d9c9ad] bg-white/70"}`}>
      <header className="flex items-center justify-between gap-2">
        <PlanBadge plan={id} />
        {current && <span className="rounded-lg bg-[#1f232b] px-2.5 py-1 text-[11px] font-bold text-white">{tx("seuPlano")}</span>}
      </header>
      <p className="font-title mt-3 text-3xl font-semibold">{full ? money(PLUS_PRICE_CENTS) + tl("/mês") : tl(p.price)}</p>
      {(!full || !PAYMENTS_ENABLED) && <p className="text-sm text-[#6b5440]">{full ? tx("m_cobrancaEmBreve") : tx("m_paraSempre")}</p>}
      <ul className="mt-4 space-y-2 text-sm">
        {FEATURES[id].filter((f) => CAPSULE_ENABLED || !f.text.startsWith("Cápsulas")).map((f) => (
          <li key={f.text} className={`flex items-start gap-2 ${f.on ? "text-[#2f2218]" : "text-[#8a7b69]"}`}>
            <span aria-hidden className={`mt-0.5 font-bold ${f.on ? "text-[#2f6a3c]" : "text-[#b0a08a]"}`}>
              {f.on ? "✓" : "–"}
            </span>
            <span className={f.on ? "" : "line-through decoration-[#c9b68f]"}>{tl(f.text)}</span>
            {!f.on && <span className="sr-only"> {tx("naoIncluso")}</span>}
          </li>
        ))}
      </ul>
      {full && <p className="mt-3 rounded-lg bg-[#fff1c9] px-3 py-2 text-xs leading-snug text-[#5a431f]">{tl("Esses formatos valem para o seu mural: quem visita o seu mural pode deixá-los lá. Assinar o PINZ+ não permite colocar esses pins nos murais de outras pessoas.")}</p>}
      {footer}
    </article>
  );
}

const btn = "mt-4 w-full cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-2.5 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-50";
const fmtDate = (iso: string | null, tag: string) => (iso ? new Date(iso).toLocaleDateString(tag) : "");

/** Planos em carrossel: o que cada um custa e inclui; com a cobrança ligada, também assina o PINZ+ e compra créditos. */
export function PlansModal({ open, onClose, plan, credits }: { open: boolean; onClose: () => void; plan: PlanId; credits: number }) {
  const tl = useLit();
  const tag = useTag();
  const money = useMoney();
  const tx = useTranslations("components.account.PlansModal");
  const [sub, setSub] = useState<Subscription>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && PAYMENTS_ENABLED) void fetchSubscription().then(setSub);
  }, [open]);

  async function buy(product: string) {
    if (product.startsWith("credits:") || product === "plus") {
      window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product } })); // créditos ou PINZ+: a janela de pagamento abre por cima
      return;
    }
    setBusy(product);
    setMsg(null);
    const err = await startCheckout(product);
    if (err) {
      setMsg(tl(err));
      setBusy(null);
    }
  }

  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = cancelRef.current;
    if (!d) return;
    if (confirmCancel && !d.open) d.showModal();
    if (!confirmCancel && d.open) d.close();
  }, [confirmCancel]);

  async function cancel() {
    setConfirmCancel(false);
    setBusy("cancel");
    setMsg((await cancelSubscription()) ? tx("m_assinaturaCanceladaOPinzContinua") : tx("m_naoFoiPossivelCancelarAgora"));
    setSub(await fetchSubscription());
    setBusy(null);
  }

  const subscribed = sub?.status === "authorized";
  const plusFooter = !PAYMENTS_ENABLED ? undefined : subscribed ? (
    <div className="mt-4 text-sm">
      <p className="font-semibold text-[#2f6a3c]">{tx("x_assinaturaAtiva", { v0: sub?.paidUntil ? ` · renova por volta de ${fmtDate(sub.paidUntil, tag)}` : "" })}</p>
      <button type="button" disabled={busy !== null} onClick={() => setConfirmCancel(true)} className="mt-2 cursor-pointer text-xs font-semibold text-[#a23b2a] underline disabled:opacity-50">
        {busy === "cancel" ? tl("Cancelando…") : tl("Cancelar assinatura")}
      </button>
    </div>
  ) : sub?.status === "once" && sub.active ? (
    <p className="mt-4 text-sm font-semibold text-[#2f6a3c]">{sub.paidUntil && new Date(sub.paidUntil).getFullYear() >= 9000 ? tx("m_pinzVitalicioParaSempre") : tx("m_pinzAtivoAte", { v0: fmtDate(sub.paidUntil, tag) })}</p>
  ) : sub?.status === "cancelled" && sub.active ? (
    <p className="mt-4 text-sm font-semibold text-[#6b5440]">{tx("x_assinaturaCanceladaPinzAte", { v0: fmtDate(sub.paidUntil, tag) })}</p>
  ) : plan === "free" ? (
    <button type="button" disabled={busy !== null} onClick={() => void buy("plus")} className={btn}>
      {busy === "plus" ? tl("Abrindo o pagamento…") : tl("Ver os planos do PINZ+")}
    </button>
  ) : undefined;

  return (
    <Modal open={open} onClose={onClose} title={tx("planos")}>
      <Carousel label={tx("planos")}>
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
          {tx.rich("x_creditosVoceTem", { soon: PAYMENTS_ENABLED ? "no" : "yes", v1: credits, s0: (c) => <span className="font-normal text-[#8a7b69]">{c}</span> })}
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CREDIT_PACKS.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border border-[#d9c9ad] bg-[#f3ead8] px-3 py-1 text-sm">
              <span>
                {tx.rich("x_creditos", { v0: c.credits, v1: money(c.cents), s0: (c) => <strong>{c}</strong> })}
              </span>
              {PAYMENTS_ENABLED && (
                <button type="button" disabled={busy !== null} onClick={() => void buy(`credits:${c.id}`)} className="cursor-pointer rounded-md bg-[#d9a21b] px-2 py-0.5 text-xs font-bold text-[#2a1c12] hover:bg-[#e6ae22] disabled:opacity-50">
                  {busy === `credits:${c.id}` ? "…" : tl("Comprar")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <dialog
        ref={cancelRef}
        aria-label={tx("cancelarAAssinatura")}
        onClose={() => setConfirmCancel(false)}
        onClick={(e) => e.target === e.currentTarget && setConfirmCancel(false)}
        className="m-auto w-[min(92vw,23rem)] max-w-none overflow-visible rounded-3xl border-0 bg-transparent p-0 backdrop:bg-[#2a1c12]/65 backdrop:backdrop-blur-sm"
      >
        <div className="rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-5 text-center text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
          <h2 className="font-title text-2xl leading-tight font-semibold">{tx("cancelarAAssinatura2")}</h2>
          <p className="mt-2 text-sm text-[#4a3826]">{tx("voceContinuaComOPinz")}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setConfirmCancel(false)} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
              {tx("manterAssinatura")}</button>
            <button type="button" onClick={() => void cancel()} className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022]">
              {tx("cancelarAssinatura")}</button>
          </div>
        </div>
      </dialog>
    </Modal>
  );
}
