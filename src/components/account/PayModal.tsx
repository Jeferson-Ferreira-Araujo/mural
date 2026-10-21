"use client";

import { useCallback, useEffect, useState } from "react";
import { CREDIT_PACKS, PLUS_ANNUAL_CENTS, PLUS_GIFT_CENTS, PLUS_LIFETIME_CENTS, PLUS_PRICE_CENTS } from "@/lib/plans";
import { pixStatus, startPix, startStripe, type PixCharge } from "@/lib/payments";
import { getMpPublicKey, loadMpSdk, payCard, paySubscription } from "@/lib/cardPay";
import { getBrowserSupabase } from "@/lib/supabase";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";
import { Skeleton } from "../Skeleton";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useMoney, usePayInfo } from "@/lib/useMoney";

type Step = "plans" | "gift" | "choose" | "pix" | "card" | "review" | "done" | "expired";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Vantagens do PINZ+ (mostradas antes de pedir qualquer dado de pagamento). */
const BENEFITS = [
  "Pins e displays sem limite (o plano gratuito tem 15)",
  "Até 10 murais",
  "Pins de desenho, música, vídeo, voz e local",
  "Pins em segredo (borrados) para os visitantes",
  "Mural compartilhado entre duas pessoas",
  "Mensagem de boas-vindas para quem entra no seu mural",
];

const GIFT_ERROR: Record<string, string> = {
  not_found: "Não encontramos essa pessoa. Confira o nome de usuário.",
  self: "O presente só vale para outra pessoa.",
  already_plus: "Essa pessoa já assina o PINZ+.",
  lifetime: "Essa pessoa já tem o PINZ+ vitalício.",
};

/**
 * Pagamento dentro do Pinz. Créditos: Pix ou cartão. PINZ+: primeiro mostra as vantagens e os planos (mensal, anual, vitalício) e o presente de 1 mês para outra pessoa;
 * depois o pagamento. O Pix mostra o QR code e o "copia e cola" aqui mesmo e confirma na tela assim que cair; o cartão usa o formulário seguro do Mercado Pago.
 */
export function PayModal({ product, onClose, onPaid }: { product: string | null; onClose: () => void; /** o pagamento foi confirmado: atualiza saldo e plano da tela */ onPaid: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.PayModal");
  const { provider } = usePayInfo();
  const money = useMoney();
  const [step, setStep] = useState<Step>("choose");
  const [target, setTarget] = useState<string | null>(null); // o que está sendo pago: "credits:<id>", "plus" (mensal), "plus_annual", "plus_life" ou "gift"
  const [recipient, setRecipient] = useState(""); // presente: nome de usuário de quem recebe
  const [giftInput, setGiftInput] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [busy, setBusy] = useState<"pix" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(0); // segundos até o código expirar
  const fromPlans = product === "plus";

  useEffect(() => {
    if (!product) return;
    setStep(product === "plus" ? "plans" : "choose");
    setTarget(product === "plus" ? null : product);
    setRecipient("");
    setGiftInput("");
    setCharge(null);
    setBusy(null);
    setError(null);
    setCopied(false);
  }, [product]);

  const pack = target?.startsWith("credits:") ? CREDIT_PACKS.find((p) => p.id === target.slice(8)) : undefined;
  const info = (() => {
    if (pack) return { cents: pack.cents, label: tx("m_pinzCreditos", { v0: pack.credits }), suffix: "", done: tx("m_creditosJaEstaoNaSua", { v0: pack.credits }), title: tl("Pagamento") };
    if (target === "plus") return { cents: PLUS_PRICE_CENTS, label: tl("PINZ+ · mensal"), suffix: "/mês", done: tx("m_oSeuMuralAgoraE"), title: tl("Assinar o PINZ+") };
    if (target === "plus_month") return { cents: PLUS_PRICE_CENTS, label: tx("m_pinz1Mes"), suffix: "", done: tx("m_oSeuMuralAgoraE2"), title: tx("m_pinzPor1Mes") };
    if (target === "plus_annual") return { cents: PLUS_ANNUAL_CENTS, label: tl("PINZ+ · anual"), suffix: "/ano", done: tx("m_oSeuMuralAgoraE3"), title: tl("PINZ+ anual") };
    if (target === "plus_life") return { cents: PLUS_LIFETIME_CENTS, label: tx("m_pinzVitalicio"), suffix: "", done: tx("m_oSeuMuralAgoraE4"), title: tx("m_pinzVitalicio2") };
    if (target === "gift") return { cents: PLUS_GIFT_CENTS, label: tx("m_presentePara1MesDe", { v0: recipient }), suffix: "", done: tx("m_jaTem1MesDe", { v0: recipient }), title: tx("m_presentearComPinz") };
    return null;
  })();
  const price = info ? money(info.cents) + (info.suffix ? tl(info.suffix) : "") : "";
  const plusTarget = target === "plus";

  const createPix = useCallback(async () => {
    if (!target) return;
    setBusy("pix");
    setError(null);
    const r = await startPix(target, target === "gift" ? recipient : undefined);
    setBusy(null);
    if ("error" in r) return setError(tl(r.error));
    setCharge(r);
    setStep("pix");
  }, [target, recipient]);

  async function checkGift() {
    const nick = giftInput.trim().replace(/^@/, "");
    if (!nick) return setError(tx("m_digiteONomeDeUsuario"));
    setGiftBusy(true);
    setError(null);
    const { data, error: err } = await getBrowserSupabase().rpc("gift_recipient", { p_nick: nick });
    setGiftBusy(false);
    const d = data as { ok?: boolean; nickname?: string; reason?: string } | null;
    if (err || !d) return setError(tx("m_naoFoiPossivelConferirAgora"));
    if (!d.ok) return setError(tl(GIFT_ERROR[String(d.reason)]) ?? tl(GIFT_ERROR.not_found));
    setRecipient(d.nickname ?? nick);
    setTarget("gift");
    setStep("choose");
  }

  // cartão: o formulário seguro do Mercado Pago aparece aqui dentro; o servidor só recebe o código do cartão
  const [cardState, setCardState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (step !== "card" || !info || !target) return;
    let alive = true;
    let controller: { unmount: () => void } | null = null;
    setCardState("loading");
    setError(null);
    void (async () => {
      const [key, ok, session] = await Promise.all([getMpPublicKey(), loadMpSdk(), getBrowserSupabase().auth.getSession()]);
      const email = session.data.session?.user.email;
      const MP = (window as unknown as { MercadoPago?: new (k: string, o: { locale: string }) => { bricks: () => { create: (t: string, id: string, o: unknown) => Promise<{ unmount: () => void }> } } }).MercadoPago;
      if (!alive) return;
      if (!key || !ok || !MP || !email) return setCardState("failed");
      try {
        const bricks = new MP(key, { locale: "pt-BR" }).bricks();
        const ctl = await bricks.create("cardPayment", "pinz-card-brick", {
          initialization: { amount: info.cents / 100, payer: { email } },
          customization: { paymentMethods: { maxInstallments: 1 }, visual: { style: { theme: "default" }, texts: { formSubmit: (plusTarget ? "Assinar " : "Pagar ") + price } } },
          callbacks: {
            onReady: () => alive && setCardState("ready"),
            onError: () => alive && setError(tx("m_naoFoiPossivelCarregarO")),
            onSubmit: (d: { token: string; payment_method_id: string; issuer_id?: string | number; payer?: { identification?: { type?: string; number?: string } } }) =>
              new Promise<void>((resolve, reject) => {
                void (async () => {
                  setError(null);
                  const card = { token: d.token, paymentMethodId: d.payment_method_id, issuerId: d.issuer_id ?? null, identification: d.payer?.identification ?? null };
                  const res = plusTarget ? await paySubscription(card) : await payCard(target, card, target === "gift" ? recipient : undefined);
                  if (res.status === "approved") {
                    resolve();
                    setStep("done");
                    onPaid();
                  } else if (res.status === "in_process" || res.status === "pending") {
                    resolve();
                    setStep("review");
                  } else {
                    setError((res.message ? tl(res.message) : undefined) ?? tx("m_oPagamentoFoiRecusadoTente"));
                    reject();
                  }
                })();
              }),
          },
        });
        if (!alive) ctl.unmount();
        else controller = ctl;
      } catch {
        if (alive) setCardState("failed");
      }
    })();
    return () => {
      alive = false;
      try {
        controller?.unmount();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, target, recipient]);

  // espera o pagamento do Pix: pergunta ao servidor a cada 3 s e mostra o tempo que falta
  useEffect(() => {
    if (step !== "pix" || !charge) return;
    const end = new Date(charge.expires).getTime();
    let alive = true;
    const tick = window.setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && alive) setStep("expired");
    }, 1000);
    const poll = window.setInterval(async () => {
      const st = await pixStatus(charge.id);
      if (!alive) return;
      if (st === "approved") {
        setStep("done");
        onPaid();
      } else if (st === "rejected" || st === "cancelled") setStep("expired");
    }, 3000);
    setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
    return () => {
      alive = false;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [step, charge, onPaid]);

  async function copy() {
    if (!charge) return;
    try {
      await navigator.clipboard.writeText(charge.qr);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sem permissão para copiar: o código segue visível para copiar à mão */
    }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const open = !!product && (fromPlans || !!pack);
  const title = step === "plans" || step === "gift" ? tl("PINZ+") : (info?.title ?? tl("PINZ+"));
  const ghost = "mt-2 w-full cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-[#6b5440] hover:bg-black/5";

  const planCard = (id: "plus" | "plus_month" | "plus_annual" | "plus_life", name: string, cents: number, suffix: string, note: string, badge?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setTarget(id);
        setError(null);
        setStep(id === "plus" && provider !== "stripe" ? "card" : "choose");
      }}
      className="relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-[#e0b04a] bg-[#fff8e4] px-4 py-3 text-left transition hover:bg-[#fff1cc] active:scale-[0.99]"
    >
      {badge && <span className="absolute -top-2.5 right-3 rounded-full bg-[#3aa655] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">{badge}</span>}
      <span>
        <span className="block text-base font-extrabold">{name}</span>
        <span className="block text-xs text-[#6b5440]">{note}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-extrabold">{money(cents)}</span>
        <span className="block text-xs font-semibold text-[#6b5440]">{suffix}</span>
      </span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title={step === "done" ? "" : title}>
      {open && (
        <div className="text-[#2f2218]">
          {step === "done" ? (
            <div role="status" className="pb-2 text-center">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3aa655] text-white shadow-[0_0.5rem_1.6rem_rgba(58,166,85,.5)]" style={{ animation: "buy-pop 0.5s ease" }}>
                <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 className="font-title mt-4 text-2xl font-semibold">{target === "gift" ? tl("Presente enviado!") : target?.startsWith("plus") ? tl("PINZ+ ativado!") : tl("Pagamento confirmado!")}</h2>
              <p className="mt-1 text-[#4a3826]">{info?.done}</p>
              <button type="button" onClick={onClose} className={`${primaryButton} mt-6`}>
                {tx("continuar")}</button>
            </div>
          ) : step === "plans" ? (
            <div>
              <p className="font-title text-xl font-semibold">{tx("tudoDoPinz")}</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {BENEFITS.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="font-bold text-[#2f6a3c]">
                      ✓
                    </span>
                    {tl(t)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 mb-3 text-sm font-semibold text-[#6b5440]">{tx("escolhaOSeuPlano")}</p>
              <div className="space-y-3.5">
                {planCard("plus", tl("Mensal (assinatura)"), PLUS_PRICE_CENTS, tl("por mês"), tl("Cobrado todo mês no cartão. Cancele quando quiser: o PINZ+ continua até o fim do período já pago."))}
                {planCard("plus_month", tl("1 mês"), PLUS_PRICE_CENTS, tl("pagamento único"), tl("Só quer usar por um mês? Pague uma vez com Pix ou cartão, sem renovação automática."))}
                {planCard("plus_annual", tl("Anual"), PLUS_ANNUAL_CENTS, tl("por ano"), tx("x_annualNote", { v0: money(Math.round(PLUS_ANNUAL_CENTS / 12)) }), tx("x_save", { pct: Math.round((1 - PLUS_ANNUAL_CENTS / (PLUS_PRICE_CENTS * 12)) * 100) }))}
                {planCard("plus_life", tl("Vitalício"), PLUS_LIFETIME_CENTS, tl("pagamento único"), tl("Pague uma vez e use para sempre. Pix ou cartão."))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("gift");
                }}
                className="mt-4 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-left transition hover:bg-white active:scale-[0.99]"
              >
                <span>
                  <span className="block text-base font-extrabold">{tx("presentearAlguem")}</span>
                  <span className="block text-xs text-[#6b5440]">{tx("t1MesDePinzPara")}</span>
                </span>
                <span className="shrink-0 text-lg font-extrabold">{money(PLUS_GIFT_CENTS)}</span>
              </button>
            </div>
          ) : step === "gift" ? (
            <div>
              <p className="font-title text-xl font-semibold">{tx("presentearCom1MesDe")}</p>
              <p className="mt-1 text-sm text-[#4a3826]">{tx("x_quemRecebeGanha30Dias", { v0: money(PLUS_GIFT_CENTS) })}</p>
              <label htmlFor="gift-nick" className="mt-4 block text-sm font-semibold">
                {tx("nomeDeUsuarioDaPessoa")}</label>
              <input
                id="gift-nick"
                value={giftInput}
                onChange={(e) => {
                  setGiftInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void checkGift()}
                placeholder={tx("usuario")}
                autoComplete="off"
                autoCapitalize="none"
                className="mt-1 w-full rounded-xl border border-[#d9c9ad] bg-white px-3 py-3 text-base outline-none focus:border-[#d98a2b]"
              />
              {error && (
                <p role="alert" className="mt-2 text-sm text-[#a23b2a]">
                  {error}
                </p>
              )}
              <button type="button" disabled={giftBusy} onClick={() => void checkGift()} className={`${primaryButton} mt-4`}>
                {giftBusy ? tl("Conferindo…") : tl("Continuar")}
              </button>
              <button type="button" onClick={() => setStep("plans")} className={ghost}>
                {tx("voltar")}</button>
            </div>
          ) : (
            <>
              {info && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ecd9a0] bg-[#fff4cc] px-4 py-3">
                  <p className="font-title text-lg leading-tight font-semibold">{info.label}</p>
                  <p className="shrink-0 text-lg font-bold">{price}</p>
                </div>
              )}

              {step === "choose" && provider === "stripe" && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm text-[#6b5440]">{tl("Você será levado a uma página segura da Stripe para concluir o pagamento.")}</p>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setBusy("pix");
                      setError(null);
                      void startStripe(target ?? "", target === "gift" ? recipient : undefined).then((err) => {
                        if (err) (setBusy(null), setError(tl(err)));
                      });
                    }}
                    className={`${primaryButton} flex items-center justify-center gap-2`}
                  >
                    {busy ? tl("Abrindo…") : tl("Pagar com cartão")}
                  </button>
                  {fromPlans && (
                    <button type="button" onClick={() => setStep(target === "gift" ? "gift" : "plans")} className={ghost}>
                      {tx("voltar")}</button>
                  )}
                </div>
              )}

              {step === "choose" && provider !== "stripe" && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm font-semibold text-[#6b5440]">{tx("comoVoceQuerPagar")}</p>
                  <button type="button" disabled={busy !== null} onClick={() => void createPix()} className={`${primaryButton} flex items-center justify-center gap-2`}>
                    {busy === "pix" ? tl("Gerando o Pix…") : tl("Pix · confirma na hora")}
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => setStep("card")} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-bold text-[#2f2218] transition hover:bg-white disabled:opacity-60">
                    {tx("cartaoDeCreditoOuDebito")}</button>
                  {fromPlans && (
                    <button type="button" onClick={() => setStep(target === "gift" ? "gift" : "plans")} className={ghost}>
                      {tx("voltar")}</button>
                  )}
                </div>
              )}

              {step === "card" && (
                <div className="mt-4">
                  {cardState === "loading" && (
                    <div role="status" aria-label={tx("carregandoOFormularioSeguro")} className="space-y-3 py-3">
                      <Skeleton className="h-11 w-full rounded-xl" />
                      <div className="flex gap-3">
                        <Skeleton className="h-11 flex-1 rounded-xl" />
                        <Skeleton className="h-11 flex-1 rounded-xl" />
                      </div>
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                  )}
                  {cardState === "failed" && (
                    <p role="alert" className="py-3 text-center text-sm text-[#a23b2a]">
                      {tx("naoFoiPossivelAbrirO")}</p>
                  )}
                  <div id="pinz-card-brick" />
                  <button type="button" onClick={() => setStep(plusTarget ? "plans" : "choose")} className={ghost}>
                    {tx("voltar")}</button>
                </div>
              )}

              {step === "review" && (
                <div role="status" className="mt-4 text-center">
                  <p aria-hidden className="text-4xl">
                    ⏳
                  </p>
                  <p className="font-title mt-2 text-xl font-semibold">{tx("pagamentoEmAnalise")}</p>
                  <p className="mt-1 text-[15px] text-[#4a3826]">{tx("assimQueOBancoConfirmar")}</p>
                  <button type="button" onClick={onClose} className={`${primaryButton} mt-5`}>
                    {tx("continuar")}</button>
                </div>
              )}

              {step === "pix" && charge && (
                <div className="mt-4 text-center">
                  {charge.qrBase64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/png;base64,${charge.qrBase64}`} alt={tx("qrCodeDoPix")} className="mx-auto size-52 rounded-xl border border-[#e1d3ba] bg-white p-2" />
                  )}
                  <p className="mt-3 text-sm text-[#4a3826]">{tx("abraOAppDoSeu")}</p>
                  <button type="button" onClick={() => void copy()} className={`${primaryButton} mt-3`}>
                    {copied ? tx("m_codigoCopiado") : tx("m_copiarCodigoPix")}
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#6b5440]" aria-live="polite">
                    <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-[#d9a21b]" />
                    {tx("x_aguardandoOPagamento", { v0: mm, v1: ss })}
                  </p>
                  <p className="mt-1 text-xs text-[#8a7b69]">{tx("assimQueVocePagarEsta")}</p>
                </div>
              )}

              {step === "expired" && (
                <div className="mt-4 text-center">
                  <p className="text-[15px] text-[#4a3826]">{tx("esseCodigoExpirouOuNao")}</p>
                  <button type="button" disabled={busy !== null} onClick={() => void createPix()} className={`${primaryButton} mt-4`}>
                    {busy ? tl("Gerando…") : tx("m_gerarUmNovoCodigo")}
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-3 text-center text-sm text-[#a23b2a]">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
