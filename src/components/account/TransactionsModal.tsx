"use client";

import { useEffect, useState } from "react";
import { BADGES } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { brl, fetchTransactions, PAY_STATUS, type Transactions, type TxLedger, type TxPayment } from "@/lib/payments";
import { Modal } from "./Modal";

const date = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Texto legível de um movimento de créditos. */
export function ledgerLabel(reason: string): string {
  const [kind, a, b, c] = reason.split(":");
  const badge = (k?: string) => BADGES.find((x) => String(x.key) === k)?.name ?? `Botton ${k}`;
  if (kind === "badge" && a === "qty") return `Botton ${badge(b)}${Number(c) > 1 ? ` · ${c} unidades` : ""}`;
  if (kind === "badge" && a === "unit") return `+1 unidade do botton ${badge(b)}`;
  if (kind === "badge" && a === "unlock") return `Botton ${badge(b)}`;
  if (kind === "board") return `Mural ${BOARDS.find((x) => x.id === a)?.name ?? a}`;
  if (kind === "mural_slot") return "Mural extra";
  if (kind === "refund") return "Reembolso de pagamento";
  if (kind === "admin") return `Ajuste do Pinz${a ? `: ${[a, b, c].filter(Boolean).join(":")}` : ""}`;
  return reason;
}

export const payTitle = (p: Pick<TxPayment, "kind" | "credits">) => (p.kind === "plus" ? "Assinatura PINZ PLUS (mensalidade)" : `${p.credits ?? ""} créditos`);

export function StatusChip({ status }: { status: string }) {
  const s = PAY_STATUS[status] ?? { text: status, tone: "wait" as const };
  const tone = s.tone === "ok" ? "bg-[#e3f4e7] text-[#1f6b36]" : s.tone === "bad" ? "bg-[#f8e1dc] text-[#a23b2a]" : "bg-[#fdf0cf] text-[#8a5a00]";
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>{s.text}</span>;
}

/** "Minhas compras": o que a pessoa já pagou e no que gastou os créditos. */
export function TransactionsModal({ open, onClose, credits }: { open: boolean; onClose: () => void; credits: number }) {
  const [tx, setTx] = useState<Transactions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    void fetchTransactions().then((t) => (t ? setTx(t) : setFailed(true)));
  }, [open]);

  const paid = (tx?.payments ?? []).filter((p) => p.status === "approved");
  const total = paid.reduce((n, p) => n + p.cents, 0);
  const bought = paid.reduce((n, p) => n + (p.credits ?? 0), 0);
  const sub = tx?.subscription;

  return (
    <Modal open={open} onClose={onClose} title="Minhas compras" wide>
      {failed ? (
        <p className="py-6 text-center text-sm text-[#a23b2a]">Não foi possível carregar agora. Tente de novo.</p>
      ) : !tx ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Total pago", brl(total)],
              ["Créditos comprados", String(bought)],
              ["Saldo atual", String(credits)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-[#e1d3ba] bg-white/70 p-3">
                <p className="font-title text-xl font-semibold">{v}</p>
                <p className="text-[11px] text-[#6b5440]">{k}</p>
              </div>
            ))}
          </div>

          {sub && (
            <p className="rounded-xl border border-[#e8d9a8] bg-[#fff6d6] px-3 py-2 text-sm">
              <strong>Assinatura PLUS:</strong> {sub.status === "authorized" ? "ativa" : sub.status === "cancelled" ? "cancelada" : sub.status}
              {sub.paidUntil ? ` · vale até ${new Date(sub.paidUntil).toLocaleDateString("pt-BR")}` : ""}
            </p>
          )}

          <section aria-label="Pagamentos">
            <h3 className="font-title text-base font-semibold">Pagamentos</h3>
            {tx.payments.length === 0 ? (
              <p className="mt-1 text-sm text-[#6b5440]">Você ainda não fez nenhum pagamento.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#e6d8bd] rounded-2xl border border-[#e1d3ba] bg-white/70">
                {tx.payments.map((p) => (
                  <li key={p.ref} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{payTitle(p)}</p>
                      <p className="text-xs text-[#6b5440]">
                        {date(p.at)} · Nº {p.ref}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>{brl(p.cents)}</strong>
                      <StatusChip status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Uso dos créditos">
            <h3 className="font-title text-base font-semibold">Uso dos créditos</h3>
            {tx.ledger.length === 0 ? (
              <p className="mt-1 text-sm text-[#6b5440]">Nenhum crédito usado ainda.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#e6d8bd] rounded-2xl border border-[#e1d3ba] bg-white/70">
                {tx.ledger.map((l: TxLedger, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{ledgerLabel(l.reason)}</p>
                      <p className="text-xs text-[#6b5440]">{date(l.at)}</p>
                    </div>
                    <strong className={l.delta > 0 ? "text-[#2f6a3c]" : "text-[#a23b2a]"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-center text-xs text-[#8a7b69]">Dúvida sobre uma cobrança? Guarde o número do pagamento (Nº) e fale com o Pinz.</p>
        </div>
      )}
    </Modal>
  );
}
