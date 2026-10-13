"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CREDIT_PACKS } from "@/lib/plans";
import { pixStatus, startCheckout, startPix, type PixCharge } from "@/lib/payments";
import { primaryButton } from "../ui";
import { Modal } from "./Modal";

type Step = "choose" | "pix" | "done" | "expired";

/**
 * Pagamento de créditos dentro do Pinz: escolhe Pix ou cartão. O Pix mostra o QR code e o "copia e cola" aqui mesmo,
 * confere o pagamento a cada poucos segundos e confirma na tela assim que cair (sem sair do Pinz). O cartão abre o Mercado Pago.
 */
export function PayModal({ product, onClose, onPaid }: { product: string | null; onClose: () => void; /** o crédito entrou: atualiza o saldo da tela */ onPaid: () => void }) {
  const pack = product?.startsWith("credits:") ? CREDIT_PACKS.find((p) => p.id === product.slice(8)) : undefined;
  const [step, setStep] = useState<Step>("choose");
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [busy, setBusy] = useState<"pix" | "card" | null>(null);
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

  async function card() {
    if (!product) return;
    setBusy("card");
    setError(null);
    const err = await startCheckout(product); // sucesso: a página vai para o Mercado Pago
    if (err) {
      setError(err);
      setBusy(null);
    }
  }

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
                  <button type="button" disabled={busy !== null} onClick={() => void card()} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-bold text-[#2f2218] transition hover:bg-white disabled:opacity-60">
                    {busy === "card" ? "Abrindo…" : "Cartão"}
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
