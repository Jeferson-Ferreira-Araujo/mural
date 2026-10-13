"use client";

import { useCallback, useEffect, useState } from "react";
import { CREDIT_PACKS, PLUS_ANNUAL_CENTS, PLUS_GIFT_CENTS, PLUS_LIFETIME_CENTS, PLUS_PRICE_CENTS } from "@/lib/plans";
import { pixStatus, startPix, type PixCharge } from "@/lib/payments";
import { getMpPublicKey, loadMpSdk, payCard, paySubscription } from "@/lib/cardPay";
import { getBrowserSupabase } from "@/lib/supabase";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";

type Step = "plans" | "gift" | "choose" | "pix" | "card" | "review" | "done" | "expired";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Vantagens do PINZ+ (mostradas antes de pedir qualquer dado de pagamento). */
const BENEFITS = [
  "Todos os espaços do mural (28, em vez de 15)",
  "Até 10 murais",
  "Pins de desenho, música, vídeo, voz e local",
  "Pins em segredo (borrados) para os visitantes",
  "Mural compartilhado entre duas pessoas",
  "Texto de boas-vindas personalizado no mural vazio",
  "Selo e borda dourada no seu perfil",
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
    if (pack) return { cents: pack.cents, label: `Pinz · ${pack.credits} créditos`, suffix: "", done: `+${pack.credits} créditos já estão na sua conta.`, title: "Pagamento" };
    if (target === "plus") return { cents: PLUS_PRICE_CENTS, label: "PINZ+ · mensal", suffix: "/mês", done: "O seu mural agora é PINZ+. Aproveite!", title: "Assinar o PINZ+" };
    if (target === "plus_annual") return { cents: PLUS_ANNUAL_CENTS, label: "PINZ+ · anual", suffix: "/ano", done: "O seu mural agora é PINZ+ por 1 ano. Aproveite!", title: "PINZ+ anual" };
    if (target === "plus_life") return { cents: PLUS_LIFETIME_CENTS, label: "PINZ+ · vitalício", suffix: "", done: "O seu mural agora é PINZ+ para sempre. Aproveite!", title: "PINZ+ vitalício" };
    if (target === "gift") return { cents: PLUS_GIFT_CENTS, label: `Presente para @${recipient} · 1 mês de PINZ+`, suffix: "", done: `@${recipient} já tem 1 mês de PINZ+ e foi avisado.`, title: "Presentear com PINZ+" };
    return null;
  })();
  const price = info ? brl(info.cents) + info.suffix : "";
  const plusTarget = target === "plus";

  const createPix = useCallback(async () => {
    if (!target) return;
    setBusy("pix");
    setError(null);
    const r = await startPix(target, target === "gift" ? recipient : undefined);
    setBusy(null);
    if ("error" in r) return setError(r.error);
    setCharge(r);
    setStep("pix");
  }, [target, recipient]);

  async function checkGift() {
    const nick = giftInput.trim().replace(/^@/, "");
    if (!nick) return setError("Digite o nome de usuário da pessoa.");
    setGiftBusy(true);
    setError(null);
    const { data, error: err } = await getBrowserSupabase().rpc("gift_recipient", { p_nick: nick });
    setGiftBusy(false);
    const d = data as { ok?: boolean; nickname?: string; reason?: string } | null;
    if (err || !d) return setError("Não foi possível conferir agora. Tente de novo.");
    if (!d.ok) return setError(GIFT_ERROR[String(d.reason)] ?? GIFT_ERROR.not_found);
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
            onError: () => alive && setError("Não foi possível carregar o formulário do cartão."),
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
                    setError(res.message ?? "O pagamento foi recusado. Tente outro cartão.");
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
  const title = step === "plans" || step === "gift" ? "PINZ+" : (info?.title ?? "PINZ+");
  const ghost = "mt-2 w-full cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-[#6b5440] hover:bg-black/5";

  const planCard = (id: "plus" | "plus_annual" | "plus_life", name: string, cents: number, suffix: string, note: string, badge?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setTarget(id);
        setError(null);
        setStep(id === "plus" ? "card" : "choose");
      }}
      className="relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-[#e0b04a] bg-[#fff8e4] px-4 py-3 text-left transition hover:bg-[#fff1cc] active:scale-[0.99]"
    >
      {badge && <span className="absolute -top-2.5 right-3 rounded-full bg-[#3aa655] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">{badge}</span>}
      <span>
        <span className="block text-base font-extrabold">{name}</span>
        <span className="block text-xs text-[#6b5440]">{note}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-extrabold">{brl(cents)}</span>
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
              <h2 className="font-title mt-4 text-2xl font-semibold">{target === "gift" ? "Presente enviado!" : target?.startsWith("plus") ? "PINZ+ ativado!" : "Pagamento confirmado!"}</h2>
              <p className="mt-1 text-[#4a3826]">{info?.done}</p>
              <button type="button" onClick={onClose} className={`${primaryButton} mt-6`}>
                Continuar
              </button>
            </div>
          ) : step === "plans" ? (
            <div>
              <p className="font-title text-xl font-semibold">Tudo do PINZ+</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {BENEFITS.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="font-bold text-[#2f6a3c]">
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 mb-3 text-sm font-semibold text-[#6b5440]">Escolha o seu plano</p>
              <div className="space-y-3.5">
                {planCard("plus", "Mensal", PLUS_PRICE_CENTS, "por mês", "Cobrado todo mês no cartão. Cancele quando quiser.")}
                {planCard("plus_annual", "Anual", PLUS_ANNUAL_CENTS, "por ano", `Equivale a ${brl(Math.round(PLUS_ANNUAL_CENTS / 12))} por mês. Pix ou cartão, sem renovação automática.`, `Economize ${Math.round((1 - PLUS_ANNUAL_CENTS / (PLUS_PRICE_CENTS * 12)) * 100)}%`)}
                {planCard("plus_life", "Vitalício", PLUS_LIFETIME_CENTS, "pagamento único", "Pague uma vez e use para sempre. Pix ou cartão.")}
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
                  <span className="block text-base font-extrabold">🎁 Presentear alguém</span>
                  <span className="block text-xs text-[#6b5440]">1 mês de PINZ+ para outro usuário. Só vale para outra pessoa.</span>
                </span>
                <span className="shrink-0 text-lg font-extrabold">{brl(PLUS_GIFT_CENTS)}</span>
              </button>
            </div>
          ) : step === "gift" ? (
            <div>
              <p className="font-title text-xl font-semibold">Presentear com 1 mês de PINZ+</p>
              <p className="mt-1 text-sm text-[#4a3826]">Quem recebe ganha 30 dias de PINZ+ na hora e é avisado. Vale só para outro usuário, por {brl(PLUS_GIFT_CENTS)}.</p>
              <label htmlFor="gift-nick" className="mt-4 block text-sm font-semibold">
                Nome de usuário da pessoa
              </label>
              <input
                id="gift-nick"
                value={giftInput}
                onChange={(e) => {
                  setGiftInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && void checkGift()}
                placeholder="@usuario"
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
                {giftBusy ? "Conferindo…" : "Continuar"}
              </button>
              <button type="button" onClick={() => setStep("plans")} className={ghost}>
                Voltar
              </button>
            </div>
          ) : (
            <>
              {info && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ecd9a0] bg-[#fff4cc] px-4 py-3">
                  <p className="font-title text-lg leading-tight font-semibold">{info.label}</p>
                  <p className="shrink-0 text-lg font-bold">{price}</p>
                </div>
              )}

              {step === "choose" && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm font-semibold text-[#6b5440]">Como você quer pagar?</p>
                  <button type="button" disabled={busy !== null} onClick={() => void createPix()} className={`${primaryButton} flex items-center justify-center gap-2`}>
                    {busy === "pix" ? "Gerando o Pix…" : "Pix · confirma na hora"}
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => setStep("card")} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-bold text-[#2f2218] transition hover:bg-white disabled:opacity-60">
                    Cartão de crédito ou débito
                  </button>
                  {fromPlans && (
                    <button type="button" onClick={() => setStep(target === "gift" ? "gift" : "plans")} className={ghost}>
                      Voltar
                    </button>
                  )}
                </div>
              )}

              {step === "card" && (
                <div className="mt-4">
                  {cardState === "loading" && <p className="py-4 text-center text-sm text-[#6b5440]">Carregando o formulário seguro…</p>}
                  {cardState === "failed" && (
                    <p role="alert" className="py-3 text-center text-sm text-[#a23b2a]">
                      Não foi possível abrir o formulário do cartão agora. Tente de novo ou pague com Pix.
                    </p>
                  )}
                  <div id="pinz-card-brick" />
                  <button type="button" onClick={() => setStep(plusTarget ? "plans" : "choose")} className={ghost}>
                    Voltar
                  </button>
                  <p className="mt-1 text-center text-xs text-[#8a7b69]">Os dados do cartão são digitados direto no Mercado Pago e não passam pelo Pinz.{plusTarget ? " Renova todo mês; cancele quando quiser em Planos." : ""}</p>
                </div>
              )}

              {step === "review" && (
                <div role="status" className="mt-4 text-center">
                  <p aria-hidden className="text-4xl">
                    ⏳
                  </p>
                  <p className="font-title mt-2 text-xl font-semibold">Pagamento em análise</p>
                  <p className="mt-1 text-[15px] text-[#4a3826]">Assim que o banco confirmar, o PINZ+ ou os créditos entram sozinhos.</p>
                  <button type="button" onClick={onClose} className={`${primaryButton} mt-5`}>
                    Continuar
                  </button>
                </div>
              )}

              {step === "pix" && charge && (
                <div className="mt-4 text-center">
                  {charge.qrBase64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/png;base64,${charge.qrBase64}`} alt="QR code do Pix" className="mx-auto size-52 rounded-xl border border-[#e1d3ba] bg-white p-2" />
                  )}
                  <p className="mt-3 text-sm text-[#4a3826]">Abra o app do seu banco, escolha Pix e leia o QR code, ou use o Pix copia e cola.</p>
                  <button type="button" onClick={() => void copy()} className={`${primaryButton} mt-3`}>
                    {copied ? "Código copiado!" : "Copiar código Pix"}
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#6b5440]" aria-live="polite">
                    <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-[#d9a21b]" />
                    Aguardando o pagamento… {mm}:{ss}
                  </p>
                  <p className="mt-1 text-xs text-[#8a7b69]">Assim que você pagar, esta tela confirma sozinha.</p>
                </div>
              )}

              {step === "expired" && (
                <div className="mt-4 text-center">
                  <p className="text-[15px] text-[#4a3826]">Esse código expirou ou não foi concluído. Nada foi cobrado.</p>
                  <button type="button" disabled={busy !== null} onClick={() => void createPix()} className={`${primaryButton} mt-4`}>
                    {busy ? "Gerando…" : "Gerar um novo código"}
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
