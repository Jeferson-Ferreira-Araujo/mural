"use client";

import { useState } from "react";
import { BADGES, badgeSrc, type BadgeInventory } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { CREDIT_PACKS, PAYMENTS_ENABLED } from "@/lib/plans";
import { startCheckout } from "@/lib/payments";
import { Modal } from "../account/Modal";

export type BuyItem = { kind: "badge"; key: number; qty: number } | { kind: "unit"; key: number; qty: number } | { kind: "board"; id: string } | { kind: "mural" };
type Tab = "pins" | "boards";

const MAX_QTY = 20;

/** Escolhe quantas unidades comprar (− n +). */
function Qty({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const b = "grid size-7 cursor-pointer place-items-center rounded-lg border border-[#d9c9ad] bg-white text-base font-bold leading-none text-[#4a3826] hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="mt-2 flex items-center justify-center gap-2">
      <button type="button" aria-label="Menos uma" disabled={value <= 1} onClick={() => onChange(value - 1)} className={b}>
        −
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <button type="button" aria-label="Mais uma" disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)} className={b}>
        +
      </button>
    </div>
  );
}

const buyBtn = "mt-2 w-full cursor-pointer rounded-lg bg-[#d9a21b] px-2 py-1.5 text-xs font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-50";

function Coin({ className = "size-6" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-grid place-items-center rounded-full border-2 border-[#b9801a] bg-[radial-gradient(circle_at_35%_30%,#ffe27a,#e8a91c_70%)] text-[0.7em] font-black text-[#7a4c00] shadow-[inset_0_0.1em_0.15em_rgba(255,255,255,.6)] ${className}`}>
      $
    </span>
  );
}

/**
 * Loja do Pinz. Os pacotes de créditos ficam sempre à vista, no topo (a compra é no Mercado Pago).
 * Com créditos se compram Bottons (e unidades extras) e Fundos de mural. Mais de um mural é do PLUS (sem limite), não se vende.
 */
export function StoreModal({ open, onClose, inventory, onBuy }: { open: boolean; onClose: () => void; inventory: BadgeInventory | null; onBuy: (item: BuyItem) => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("pins");
  const [busy, setBusy] = useState<string | null>(null);
  const [pinView, setPinView] = useState<"new" | "mine">("new");
  const [qty, setQty] = useState<Record<number, number>>({}); // quantas unidades o usuário escolheu comprar de cada pin
  const qtyOf = (key: number) => qty[key] ?? 1;
  const credits = inventory?.credits ?? 0;
  const byKey = new Map((inventory?.catalog ?? []).map((c) => [c.key, c]));
  const pinsToBuy = BADGES.filter((b) => byKey.has(b.key) && !byKey.get(b.key)!.owned);
  const myPins = BADGES.filter((b) => byKey.has(b.key) && byKey.get(b.key)!.owned);
  const boards = new Map((inventory?.boards ?? []).map((b) => [b.id, b]));

  async function buy(id: string, item: BuyItem) {
    setBusy(id);
    await onBuy(item);
    setBusy(null);
  }
  async function buyCredits(id: string) {
    setBusy(`credits:${id}`);
    const err = await startCheckout(`credits:${id}`);
    if (err) {
      window.alert(err);
      setBusy(null);
    }
  }
  const can = (cost: number) => credits >= cost;
  const label = (cost: number) => (credits >= cost ? `Comprar · ${cost} cr.` : `${cost} cr. (faltam)`);

  return (
    <Modal open={open} onClose={onClose} title="Loja" xl>
      {/* créditos e pacotes: sempre à vista, sem entrar em outra aba */}
      <section aria-label="Comprar créditos" className="mb-5 rounded-2xl border border-[#e8d9a8] bg-[#fff6d6] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm">
            <Coin className="size-7" />
            Seus créditos: <strong className="text-xl">{credits}</strong>
          </p>
          <p className="text-xs text-[#6b5440]">{PAYMENTS_ENABLED ? "Escolha um pacote · pagamento no Mercado Pago (Pix, cartão…)" : "Compra de créditos: em breve"}</p>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CREDIT_PACKS.map((p) => (
            <li key={p.id} className="flex flex-col items-center rounded-xl border border-[#e1d3ba] bg-white/80 p-3 text-center">
              <p className="flex items-center gap-1.5 font-title text-2xl font-semibold">
                <Coin className="size-5" />
                {p.credits}
              </p>
              <p className="mt-0.5 text-lg font-bold">{p.price}</p>
              <p className="min-h-4 text-[11px] font-semibold text-[#2f6a3c]">{p.note ?? ""}</p>
              <button type="button" disabled={!PAYMENTS_ENABLED || busy !== null} onClick={() => void buyCredits(p.id)} className={buyBtn}>
                {!PAYMENTS_ENABLED ? "Em breve" : busy === `credits:${p.id}` ? "Abrindo…" : "Comprar"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div role="tablist" aria-label="Loja" className="mb-4 grid grid-cols-2 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(
          [
            ["pins", "Bottons"],
            ["boards", "Fundos do mural"],
          ] as const
        ).map(([id, text]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
            {text}
          </button>
        ))}
      </div>

      {!inventory ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando a loja…</p>
      ) : tab === "pins" ? (
        <>
          <div role="tablist" aria-label="Bottons" className="mb-3 grid max-w-xs grid-cols-2 rounded-lg border border-[#e1d3ba] bg-white/60 p-0.5 text-xs">
            {(
              [
                ["new", `Novos (${pinsToBuy.length})`],
                ["mine", `Meus Bottons (${myPins.length})`],
              ] as const
            ).map(([id, text]) => (
              <button key={id} role="tab" type="button" aria-selected={pinView === id} onClick={() => setPinView(id)} className={`cursor-pointer rounded-md py-1.5 font-semibold ${pinView === id ? "bg-[#1f232b] text-white" : "text-[#4a3826]"}`}>
                {text}
              </button>
            ))}
          </div>
          {(pinView === "new" ? pinsToBuy : myPins).length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b5440]">{pinView === "new" ? "Você já liberou todos os Bottons. Novos chegam em breve!" : "Você ainda não tem Bottons."}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {(pinView === "new" ? pinsToBuy : myPins).map((b) => {
                const c = byKey.get(b.key)!;
                return (
                  <li key={b.key} className="flex flex-col items-center rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5 text-center">
                    <div className="grid h-16 w-full place-items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={badgeSrc(b.key)} alt="" draggable={false} className="max-h-14 max-w-14 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(60,30,0,.4))" }} />
                    </div>
                    <p className="mt-1 w-full truncate text-xs font-semibold">{b.name ?? `Botton ${b.key}`}</p>
                    {pinView === "new" ? (
                      <>
                        <Qty value={qtyOf(b.key)} onChange={(n) => setQty((q) => ({ ...q, [b.key]: n }))} label={`Quantidade de ${b.name ?? `Botton ${b.key}`}`} />
                        <button type="button" disabled={busy === `b${b.key}` || !can(c.price + c.unitPrice * (qtyOf(b.key) - 1))} onClick={() => buy(`b${b.key}`, { kind: "badge", key: b.key, qty: qtyOf(b.key) })} className={buyBtn}>
                          {label(c.price + c.unitPrice * (qtyOf(b.key) - 1))}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] text-[#6b5440]">{1 + c.extra} unidade(s)</p>
                        <Qty value={qtyOf(b.key)} onChange={(n) => setQty((q) => ({ ...q, [b.key]: n }))} label={`Quantidade de ${b.name ?? `Botton ${b.key}`}`} />
                        <button type="button" disabled={busy === `u${b.key}` || !can(c.unitPrice * qtyOf(b.key))} onClick={() => buy(`u${b.key}`, { kind: "unit", key: b.key, qty: qtyOf(b.key) })} className={buyBtn}>
                          {can(c.unitPrice * qtyOf(b.key)) ? `+${qtyOf(b.key)} unidade${qtyOf(b.key) > 1 ? "s" : ""} · ${c.unitPrice * qtyOf(b.key)} cr.` : `${c.unitPrice * qtyOf(b.key)} cr. (faltam)`}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOARDS.map((b) => {
            const info = boards.get(b.id);
            const owned = info?.owned ?? b.id === "cortica";
            return (
              <li key={b.id} className="overflow-hidden rounded-2xl border border-[#e1d3ba] bg-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={`Fundo ${b.name}`} className="aspect-[3/2] w-full object-cover" draggable={false} />
                <div className="p-3">
                  <p className="font-title text-base font-semibold">{b.name}</p>
                  {owned ? (
                    <p className="mt-1 text-xs font-semibold text-[#2f6a3c]">{b.id === "cortica" ? "Fundo padrão ✓" : "É seu ✓ (aplique em Editar mural)"}</p>
                  ) : (
                    <button type="button" disabled={busy === `t${b.id}` || !can(info?.price ?? 3)} onClick={() => buy(`t${b.id}`, { kind: "board", id: b.id })} className={buyBtn}>
                      {label(info?.price ?? 3)}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
