"use client";

import { primaryButton } from "../ui";
import { Modal } from "./Modal";

/** Resultado da volta do Mercado Pago: aparece por cima da loja (ou do mural), sem sair da tela onde a pessoa estava. */
export const PAY_RESULTS: Record<string, { icon: string; title: string; body: string }> = {
  ok: { icon: "🎉", title: "Pagamento recebido!", body: "Seus créditos entram na conta em instantes. O saldo da loja atualiza sozinho." },
  pendente: { icon: "⏳", title: "Pagamento em análise", body: "Assim que o Mercado Pago confirmar, seus créditos entram sozinhos na conta." },
  falhou: { icon: "↩️", title: "Pagamento não concluído", body: "Nada foi cobrado. Você pode tentar de novo quando quiser." },
  plus: { icon: "⭐", title: "Assinatura enviada!", body: "Assim que o Mercado Pago confirmar, o seu mural vira PLUS automaticamente. Pode levar alguns instantes." },
};

export function PaymentResultModal({ result, onClose }: { result: string | null; onClose: () => void }) {
  const r = result ? PAY_RESULTS[result] : undefined;
  return (
    <Modal open={!!r} onClose={onClose} title="">
      {r && (
        <div role="status" className="pb-2 text-center">
          <p aria-hidden className="text-5xl">
            {r.icon}
          </p>
          <h2 className="font-title mt-3 text-2xl font-semibold">{r.title}</h2>
          <p className="mt-2 text-[#4a3826]">{r.body}</p>
          <button type="button" onClick={onClose} className={`${primaryButton} mt-6`}>
            Continuar
          </button>
        </div>
      )}
    </Modal>
  );
}
