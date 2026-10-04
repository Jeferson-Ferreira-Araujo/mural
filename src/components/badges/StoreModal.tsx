"use client";

import Link from "next/link";
import { useState } from "react";
import { BADGES, badgeSrc, type BadgeInventory } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { CREDIT_PACKS } from "@/lib/plans";
import { Modal } from "../account/Modal";

export type BuyItem = { kind: "badge"; key: number } | { kind: "unit"; key: number } | { kind: "board"; id: string } | { kind: "mural" };
type Tab = "pins" | "themes" | "murals" | "credits";

const buyBtn = "mt-2 w-full cursor-pointer rounded-lg bg-[#d9a21b] px-2 py-1.5 text-xs font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Loja do Pinz. Qualquer conta compra com créditos: pins decorativos (e unidades extras no grátis) e temas (fundos). Mural extra é do PLUS.
 * Os pacotes de créditos aparecem aqui (a cobrança em dinheiro ainda não existe).
 */
export function StoreModal({ open, onClose, inventory, onBuy }: { open: boolean; onClose: () => void; inventory: BadgeInventory | null; onBuy: (item: BuyItem) => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("pins");
  const [busy, setBusy] = useState<string | null>(null);
  const [pinView, setPinView] = useState<"new" | "mine">("new");
  const credits = inventory?.credits ?? 0;
  const plus = inventory?.plus === true;
  const byKey = new Map((inventory?.catalog ?? []).map((c) => [c.key, c]));
  const pinsToBuy = BADGES.filter((b) => byKey.has(b.key) && !byKey.get(b.key)!.owned);
  const myPins = BADGES.filter((b) => byKey.has(b.key) && byKey.get(b.key)!.owned);
  const boards = new Map((inventory?.boards ?? []).map((b) => [b.id, b]));
  const slots = 1 + (inventory?.extraMurals ?? 0);
  const used = inventory?.muralCount ?? 0;

  async function buy(id: string, item: BuyItem) {
    setBusy(id);
    await onBuy(item);
    setBusy(null);
  }
  const can = (cost: number) => credits >= cost;
  const label = (cost: number) => (credits >= cost ? `Comprar · ${cost} cr.` : `${cost} cr. (faltam)`);

  return (
    <Modal open={open} onClose={onClose} title="Loja" wide>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e1d3ba] bg-white/60 px-4 py-3">
        <p className="text-sm">
          Seus créditos: <strong className="text-lg">{credits}</strong>
        </p>
        <p className="text-xs text-[#6b5440]">Comprar créditos: em breve</p>
      </div>
      <p className="mb-3 text-sm text-[#4a3826]">
        {plus ? "No PINZ PLUS você tem os 25 Bottons iniciais, quantas unidades quiser. Bottons novos, temas e murais extras se compram com créditos." : "No PINZ FREE você tem 10 Bottons, 1 unidade de cada. Compre mais Bottons, unidades extras e temas com créditos. O PINZ PLUS libera os 25 Bottons iniciais, unidades ilimitadas e murais extras."}
      </p>

      <div role="tablist" aria-label="Loja" className="mb-4 grid grid-cols-4 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(
          [
            ["pins", "Bottons"],
            ["themes", "Temas"],
            ["murals", "Murais"],
            ["credits", "Créditos"],
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
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
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
                      <button type="button" disabled={busy === `b${b.key}` || !can(c.price)} onClick={() => buy(`b${b.key}`, { kind: "badge", key: b.key })} className={buyBtn}>
                        {label(c.price)}
                      </button>
                    ) : plus ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#2f6a3c]">Ilimitado ✓</p>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] text-[#6b5440]">{1 + c.extra} unidade(s)</p>
                        <button type="button" disabled={busy === `u${b.key}` || !can(c.unitPrice)} onClick={() => buy(`u${b.key}`, { kind: "unit", key: b.key })} className={buyBtn}>
                          {can(c.unitPrice) ? `+1 unidade · ${c.unitPrice} cr.` : "Sem créditos"}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : tab === "themes" ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {BOARDS.map((b) => {
            const info = boards.get(b.id);
            const owned = info?.owned ?? b.id === "cortica";
            return (
              <li key={b.id} className="overflow-hidden rounded-2xl border border-[#e1d3ba] bg-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={`Tema ${b.name}`} className="aspect-[3/2] w-full object-cover" draggable={false} />
                <div className="p-3">
                  <p className="font-title text-base font-semibold">{b.name}</p>
                  {owned ? (
                    <p className="mt-1 text-xs font-semibold text-[#2f6a3c]">{b.id === "cortica" ? "Tema padrão ✓" : "É seu ✓ (aplique em Editar mural)"}</p>
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
      ) : tab === "murals" ? (
        <div className="rounded-2xl border border-[#e1d3ba] bg-white/70 p-5">
          <h3 className="font-title text-lg font-semibold">Mural extra</h3>
          <p className="mt-1 text-sm text-[#4a3826]">Tenha mais de um mural: um para cada ocasião ou grupo de amigos. Cada mural tem 28 espaços.</p>
          <p className="mt-3 text-sm">
            Seus murais: <strong>{used}</strong> de <strong>{slots}</strong> permitidos
          </p>
          <button type="button" disabled={busy === "mural" || !can(inventory.muralPrice)} onClick={() => buy("mural", { kind: "mural" })} className={`${buyBtn} sm:max-w-xs`}>
            {plus ? (credits >= inventory.muralPrice ? `Comprar um mural · ${inventory.muralPrice} cr.` : `${inventory.muralPrice} cr. (faltam)`) : "Só no PLUS"}
          </button>
          {plus && used < slots && (
            <Link href="/criar" className="mt-3 inline-block rounded-lg border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#efe4cf]">
              Criar o novo mural agora
            </Link>
          )}
        </div>
      ) : (
        <div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CREDIT_PACKS.map((p) => (
              <li key={p.credits} className="flex flex-col items-center rounded-2xl border border-[#e1d3ba] bg-white/70 p-4 text-center">
                <p className="font-title text-3xl font-semibold">{p.credits}</p>
                <p className="text-xs text-[#6b5440]">créditos</p>
                <p className="mt-2 text-lg font-bold">{p.price}</p>
                {p.note && <p className="text-[11px] font-semibold text-[#2f6a3c]">{p.note}</p>}
                <button type="button" disabled className={buyBtn}>
                  Em breve
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-[#6b5440]">Os créditos servem para comprar Bottons, temas e murais extras. Quanto maior o pacote, mais créditos de bônus.</p>
        </div>
      )}
    </Modal>
  );
}
