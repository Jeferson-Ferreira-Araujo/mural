"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CREDIT_PACKS } from "@/lib/plans";
import { pixStatus, startPix, type PixCharge } from "@/lib/payments";
import { getMpPublicKey, loadMpSdk, payCard } from "@/lib/cardPay";
import { getBrowserSupabase } from "@/lib/supabase";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";

type Step = "choose" | "pix" | "card" | "review" | "done" | "expired";

/**
 * Pagamento de créditos dentro do Pinz: escolhe Pix ou cartão. O Pix mostra o QR code e o "copia e cola" aqui mesmo,
 * confere o pagamento a cada poucos segundos e confirma na tela assim que cair (sem sair do Pinz). O cartão abre o Mercado Pago.
 */
export function PayModal({ product, onClose, onPaid }: { product: string | null; onClose: () => void; /** o crédito entrou: atualiza o saldo da tela */ onPaid: () => void }) {
  const pack = product?.startsWith("credits:") ? CREDIT_PACKS.find((p) => p.id === product.slice(8)) : undefined;
  const [step, setStep] = useState<Step>("choose");
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [busy, setBusy] = useState<"pix" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(0); // segundos até o código expirar
  const paid = useRef(false);

  useEffect(() => {
    if (!product) return;
    setStep("choose");
    setCharge(null);
    setBusy(null);
    setError(null);
    setCopied(false);
    paid.current = false;
  }, [product]);

  const createPix = useCallback(async () => {
    if (!product) return;
    setBusy("pix");
    setError(null);
    const r = await startPix(product);
    setBusy(null);
    if ("error" in r) return setError(r.error);
    setCharge(r);
    setStep("pix");
  }, [product]);

  // cartão: o formulário seguro do Mercado Pago aparece aqui dentro; o servidor só recebe o código do cartão
  const [cardState, setCardState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (step !== "card" || !pack || !product) return;
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
          initialization: { amount: pack.cents / 100, payer: { email } },
          customization: { paymentMethods: { maxInstallments: 1 }, visual: { style: { theme: "default" }, texts: { formSubmit: "Pagar " + price } } },
          callbacks: {
            onReady: () => alive && setCardState("ready"),
            onError: () => alive && setError("Não foi possível carregar o formulário do cartão."),
            onSubmit: (d: { token: string; payment_method_id: string; issuer_id?: string | number; payer?: { identification?: { type?: string; number?: string } } }) =>
              new Promise<void>((resolve, reject) => {
                void (async () => {
                  setError(null);
                  const res = await payCard(product, { token: d.token, paymentMethodId: d.payment_method_id, issuerId: d.issuer_id ?? null, identification: d.payer?.identification ?? null });
                  if (res.status === "approved") {
                    resolve();
                    paid.current = true;
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
  }, [step, product]);

  // espera o pagamento: pergunta ao servidor a cada 3 s e mostra o tempo que falta
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
        paid.current = true;
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
  const price = pack ? (pack.cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

  return (
    <Modal open={!!pack} onClose={onClose} title={step === "done" ? "" : "Pagamento"}>
      {pack && (
        <div className="text-[#2f2218]">
          {step === "done" ? (
            <div role="status" className="pb-2 text-center">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3aa655] text-white shadow-[0_0.5rem_1.6rem_rgba(58,166,85,.5)]" style={{ animation: "buy-pop 0.5s ease" }}>
                <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 className="font-title mt-4 text-2xl font-semibold">Pagamento confirmado!</h2>
              <p className="mt-1 text-[#4a3826]">+{pack.credits} créditos já estão na sua conta.</p>
              <button type="button" onClick={onClose} className={`${primaryButton} mt-6`}>
                Continuar
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ecd9a0] bg-[#fff4cc] px-4 py-3">
                <p className="font-title text-lg font-semibold">Pinz · {pack.credits} créditos</p>
                <p className="text-lg font-bold">{price}</p>
              </div>

              {step === "choose" && (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm font-semibold text-[#6b5440]">Como você quer pagar?</p>
                  <button type="button" disabled={busy !== null} onClick={() => void createPix()} className={`${primaryButton} flex items-center justify-center gap-2`}>
                    {busy === "pix" ? "Gerando o Pix…" : "Pix · confirma na hora"}
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => setStep("card")} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-bold text-[#2f2218] transition hover:bg-white disabled:opacity-60">
                    Cartão de crédito ou débito
                  </button>
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
                  <button type="button" onClick={() => setStep("choose")} className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-[#6b5440] hover:bg-black/5">
                    Voltar
                  </button>
                  <p className="mt-1 text-center text-xs text-[#8a7b69]">Os dados do cartão são digitados direto no Mercado Pago e não passam pelo Pinz.</p>
                </div>
              )}

              {step === "review" && (
                <div role="status" className="mt-4 text-center">
                  <p aria-hidden className="text-4xl">
                    ⏳
                  </p>
                  <p className="font-title mt-2 text-xl font-semibold">Pagamento em análise</p>
                  <p className="mt-1 text-[15px] text-[#4a3826]">Assim que o banco confirmar, seus créditos entram sozinhos na conta.</p>
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
