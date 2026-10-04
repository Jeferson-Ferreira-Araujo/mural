"use client";

import { useState } from "react";
import { BADGES, badgeSrc, stockFor, type BadgeInventory } from "@/lib/badges";
import type { PlanId } from "@/lib/plans";
import { Modal } from "../account/Modal";

type Tab = "store" | "mine";

/**
 * Loja de pins decorativos: os novos se liberam com créditos; no FREE cada pin tem 1 unidade e dá para comprar unidades extras.
 * No FULL a quantidade de cada pin é ilimitada. (A compra de créditos em dinheiro ainda não existe.)
 */
export function StoreModal({
  open,
  onClose,
  plan,
  inventory,
  placed,
  onBuy,
}: {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
  inventory: BadgeInventory | null;
  /** quantas unidades de cada pin já estão no mural */
  placed: Record<number, number>;
  onBuy: (key: number, mode: "unlock" | "unit") => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("store");
  const [busy, setBusy] = useState<number | null>(null);
  const credits = inventory?.credits ?? 0;
  const byKey = new Map((inventory?.catalog ?? []).map((c) => [c.key, c]));
  const items = BADGES.filter((b) => byKey.has(b.key));
  const shop = items.filter((b) => !byKey.get(b.key)!.owned);
  const mine = items.filter((b) => byKey.get(b.key)!.owned);
  const list = tab === "store" ? shop : mine;

  async function buy(key: number, mode: "unlock" | "unit") {
    setBusy(key);
    await onBuy(key, mode);
    setBusy(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="Loja de pins" wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e1d3ba] bg-white/60 px-4 py-3">
        <p className="text-sm">
          Seus créditos: <strong className="text-lg">{credits}</strong>
        </p>
        <p className="text-xs text-[#6b5440]">Comprar créditos: em breve</p>
      </div>
      <p className="mb-3 text-sm text-[#4a3826]">{plan === "full" ? "No PINZ FULL você coloca quantas unidades quiser de cada pin que tem. Os novos se liberam com créditos." : "No PINZ FREE cada pin tem 1 unidade: ao colocar no mural ele esgota na barra. Compre unidades extras ou libere novos pins com créditos."}</p>

      <div role="tablist" aria-label="Loja" className="mb-4 grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(
          [
            ["store", `Novos pins (${shop.length})`],
            ["mine", `Meus pins (${mine.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
            {label}
          </button>
        ))}
      </div>

      {!inventory ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando a loja…</p>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">{tab === "store" ? "Você já liberou todos os pins. Novos chegam em breve!" : "Você ainda não tem pins."}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {list.map((b) => {
            const c = byKey.get(b.key)!;
            const st = stockFor(c, plan, placed[b.key] ?? 0);
            const can = (cost: number) => credits >= cost;
            return (
              <li key={b.key} className="flex flex-col items-center rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5 text-center">
                <div className="grid h-16 w-full place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={badgeSrc(b.key)} alt="" draggable={false} className="max-h-14 max-w-14 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(60,30,0,.4))" }} />
                </div>
                <p className="mt-1 w-full truncate text-xs font-semibold">{b.name ?? `Pin ${b.key}`}</p>
                {!c.owned ? (
                  <button type="button" disabled={busy === b.key || !can(c.price)} onClick={() => buy(b.key, "unlock")} className="mt-2 w-full cursor-pointer rounded-lg bg-[#d9a21b] px-2 py-1.5 text-xs font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-50">
                    {can(c.price) ? `Liberar · ${c.price} cr.` : `${c.price} cr. (faltam)`}
                  </button>
                ) : plan === "full" ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#2f6a3c]">Ilimitado ✓</p>
                ) : (
                  <>
                    <p className="mt-1 text-[11px] text-[#6b5440]">
                      {st.left} de {st.total} disponível
                    </p>
                    <button type="button" disabled={busy === b.key || !can(c.unitPrice)} onClick={() => buy(b.key, "unit")} className="mt-1.5 w-full cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-2 py-1.5 text-xs font-semibold transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-50">
                      {can(c.unitPrice) ? `+1 unidade · ${c.unitPrice} cr.` : "Sem créditos"}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
