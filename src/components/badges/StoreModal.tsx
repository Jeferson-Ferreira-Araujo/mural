"use client";

import { useEffect, useState } from "react";
import { BADGES, badgeSrc, type BadgeInventory } from "@/lib/badges";
import { BADGE_CATEGORIES, BADGE_CATEGORY, NEW_BADGES_COUNT, STORE_DUPLICATES } from "@/lib/badgeCategories";
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

const buyBtn = "mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#f6c93f] px-2 py-1.5 text-sm font-bold text-[#3a2a08] transition hover:bg-[#fad45a] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45";

const CONFETTI = ["#e8a91c", "#e0495a", "#3aa655", "#4a90e2", "#b565d9", "#f08a24", "#ffd54a", "#2fb8a6"];

/** Confete que sai do centro do cartão (só CSS; some sozinho). */
function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-visible">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
        const d = 46 + (i % 3) * 16;
        return (
          <span
            key={i}
            className="absolute size-2 rounded-[2px]"
            style={{
              background: CONFETTI[i % CONFETTI.length],
              ["--dx" as string]: `${Math.cos(a) * d}px`,
              ["--dy" as string]: `${Math.sin(a) * d - 8}px`,
              ["--r" as string]: `${(i % 2 ? 1 : -1) * (120 + i * 20)}deg`,
              animation: "confetti 0.9s ease-out forwards",
            }}
          />
        );
      })}
    </span>
  );
}

type Done = { id: string; title: string; text: string; img?: string; spent: number; at: number };

/** Moeda do Pinz (public/img/moeda.webp). O tamanho vem do `className`. */
function Coin({ className = "size-6" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className={`shrink-0 select-none object-contain drop-shadow-[0_0.15rem_0.2rem_rgba(120,70,0,.35)] ${className}`} />;
}

/** Tamanho da moeda de cada pacote: quanto mais créditos, maior (e mais moedas). */
const COIN_SIZE = ["size-10", "size-12", "size-14", "size-16"];

/**
 * Loja do Pinz. Os pacotes de créditos ficam sempre à vista, no topo (a compra é no Mercado Pago).
 * Com créditos se compram Bottons (e unidades extras) e Fundos de mural. Mais de um mural é do PLUS (sem limite), não se vende.
 */
export function StoreModal({ open, onClose, inventory, onBuy }: { open: boolean; onClose: () => void; inventory: BadgeInventory | null; onBuy: (item: BuyItem) => Promise<boolean> }) {
  const [tab, setTab] = useState<Tab>("pins");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("new"); // "new" | "all" | id da categoria
  const [qty, setQty] = useState<Record<number, number>>({}); // quantas unidades o usuário escolheu comprar de cada pin
  const qtyOf = (key: number) => qty[key] ?? 1;
  const credits = inventory?.credits ?? 0;
  const byKey = new Map((inventory?.catalog ?? []).map((c) => [c.key, c]));
  // a loja mostra TODOS os bottons do site; quem já tem um compra só unidades extras
  const all = BADGES.filter((b) => byKey.has(b.key) && (!STORE_DUPLICATES.has(b.key) || byKey.get(b.key)!.owned));
  const shown =
    filter === "new" ? [...all].sort((a, b) => b.key - a.key).slice(0, NEW_BADGES_COUNT) : filter === "all" ? all : all.filter((b) => BADGE_CATEGORY[b.key] === filter);
  const chips: { id: string; text: string }[] = [
    { id: "new", text: "Novos" },
    { id: "all", text: `Todos (${all.length})` },
    ...BADGE_CATEGORIES.map((c) => ({ id: c.id, text: c.label })),
  ];
  const boards = new Map((inventory?.boards ?? []).map((b) => [b.id, b]));

  const [done, setDone] = useState<Done | null>(null);
  // a comemoração some depois de alguns segundos
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 5000);
    return () => clearTimeout(t);
  }, [done]);

  async function buy(id: string, item: BuyItem, win: { title: string; text: string; img?: string; spent: number }) {
    setBusy(id);
    const ok = await onBuy(item);
    setBusy(null);
    if (ok) {
      setDone({ id, ...win, at: Date.now() });
      if (item.kind === "badge" || item.kind === "unit") setQty((q) => ({ ...q, [item.key]: 1 })); // depois de comprar, volta para 1 unidade
    }
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

  return (
    <Modal open={open} onClose={onClose} title="Loja" xl>
      {/* créditos e pacotes: sempre à vista, sem entrar em outra aba */}
      <section aria-label="Comprar créditos" className="mb-5 overflow-hidden rounded-3xl border border-[#ecd9a0] bg-gradient-to-b from-[#fff4cc] to-[#fff9e6]">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#ecd9a0]/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Coin className="size-12 sm:size-14" />
            <div className="leading-tight">
              <p className="text-xs font-semibold tracking-wide text-[#8a6a1c] uppercase">Seus créditos</p>
              <p className="relative">
                <strong key={done?.at ?? 0} className="font-title inline-block text-3xl sm:text-4xl" style={done ? { animation: "buy-pop 0.6s ease" } : undefined}>
                  {credits}
                </strong>
                {done && done.spent > 0 && (
                  <span key={done.at} aria-hidden className="pointer-events-none absolute -top-1 left-full ml-2 text-base font-bold text-[#c0392b]" style={{ animation: "float-up 1.6s ease-out forwards" }}>
                    −{done.spent}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[#6b5440]">
            <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {PAYMENTS_ENABLED ? "Pagamento seguro no Mercado Pago (Pix ou cartão)" : "Compra de créditos: em breve"}
          </p>
        </header>
        <ul className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:p-4">
          {CREDIT_PACKS.map((p, i) => (
            <li key={p.id} className="relative flex flex-col items-center rounded-2xl border border-[#e8d9b0] bg-white px-3 pt-4 pb-3 text-center shadow-[0_0.2rem_0.6rem_rgba(120,80,0,.08)]">
              {p.note && <span className="absolute -top-2.5 rounded-full bg-[#2f9e5a] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">{p.note}</span>}
              <div className="grid h-16 place-items-center">
                <Coin className={COIN_SIZE[i] ?? "size-12"} />
              </div>
              <p className="font-title mt-1 text-3xl leading-none font-semibold">{p.credits}</p>
              <p className="text-xs text-[#8a7b69]">créditos</p>
              <p className="mt-3 text-xl font-bold">{p.price}</p>
              <button type="button" disabled={!PAYMENTS_ENABLED || busy !== null} onClick={() => void buyCredits(p.id)} className="mt-3 w-full cursor-pointer rounded-xl bg-[#f6c93f] px-3 py-2 text-sm font-bold text-[#3a2a08] transition hover:bg-[#fad45a] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">
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
          <div role="tablist" aria-label="Categorias de Bottons" className="mb-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button key={c.id} role="tab" type="button" aria-selected={filter === c.id} onClick={() => setFilter(c.id)} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === c.id ? "border-[#1f232b] bg-[#1f232b] text-white" : "border-[#e1d3ba] bg-white/70 text-[#4a3826] hover:bg-[#efe4cf]"}`}>
                {c.text}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b5440]">Nenhum botton nesta categoria ainda.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {shown.map((b) => {
                const c = byKey.get(b.key)!;
                const owned = c.starter || c.owned;
                const n = qtyOf(b.key);
                const cost = owned ? c.unitPrice * n : c.price + c.unitPrice * (n - 1);
                const name = b.name ?? `Botton ${b.key}`;
                const just = done?.id === `p${b.key}`;
                return (
                  <li key={b.key} className={`relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition-colors ${just ? "border-[#3aa655] bg-[#effbf1] shadow-[0_0_0_3px_rgba(58,166,85,.35)]" : "border-[#e1d3ba] bg-white/70"}`} style={just ? { animation: "buy-pop 0.6s ease" } : undefined}>
                    {just && <Confetti key={done.at} />}
                    <div className="grid h-16 w-full place-items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={badgeSrc(b.key)} alt="" draggable={false} className="max-h-14 max-w-14 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(60,30,0,.4))", animation: just ? "buy-wiggle 0.9s ease" : undefined }} />
                    </div>
                    <p className="mt-1 w-full truncate text-xs font-semibold">{name}</p>
                    <Qty value={n} onChange={(v) => setQty((q) => ({ ...q, [b.key]: v }))} label={`Quantidade de ${name}`} />
                    {just ? (
                      <p className="mt-2 w-full rounded-lg bg-[#3aa655] px-2 py-1.5 text-xs font-bold text-white">✓ Comprado!</p>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === `p${b.key}` || !can(cost)}
                        title={can(cost) ? undefined : "Créditos insuficientes"}
                        aria-label={`${owned ? "Comprar mais " + n + " de" : "Comprar"} ${name} por ${cost} crédito${cost > 1 ? "s" : ""}`}
                        onClick={() =>
                          buy(
                            `p${b.key}`,
                            owned ? { kind: "unit", key: b.key, qty: n } : { kind: "badge", key: b.key, qty: n },
                            {
                              title: name,
                              text: owned ? `+${n} unidade${n > 1 ? "s" : ""} já disponível${n > 1 ? "s" : ""} na sua barra de bottons.` : n > 1 ? `liberado com ${n} unidades! Já está na sua barra de bottons.` : "liberado! Já está na sua barra de bottons.",
                              img: badgeSrc(b.key),
                              spent: cost,
                            },
                          )
                        }
                        className={buyBtn}
                      >
                        {busy === `p${b.key}` ? "Comprando…" : (<><Coin className="size-4" />{cost}</>)}
                      </button>
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
            const just = done?.id === `t${b.id}`;
            return (
              <li key={b.id} className={`relative overflow-hidden rounded-2xl border bg-white/70 ${just ? "border-[#3aa655] shadow-[0_0_0_3px_rgba(58,166,85,.35)]" : "border-[#e1d3ba]"}`} style={just ? { animation: "buy-pop 0.6s ease" } : undefined}>
                {just && <Confetti key={done.at} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={`Fundo ${b.name}`} className="aspect-[3/2] w-full object-cover" draggable={false} />
                <div className="p-3">
                  <p className="font-title text-base font-semibold">{b.name}</p>
                  {owned ? (
                    <p className="mt-1 text-xs font-semibold text-[#2f6a3c]">{just ? "✓ Comprado! Aplique em Editar mural." : b.id === "cortica" ? "Fundo padrão ✓" : "É seu ✓ (aplique em Editar mural)"}</p>
                  ) : (
                    <button type="button" disabled={busy === `t${b.id}` || !can(info?.price ?? 3)} onClick={() => buy(`t${b.id}`, { kind: "board", id: b.id }, { title: `Fundo ${b.name}`, text: "liberado! Aplique em Editar mural.", img: b.image, spent: info?.price ?? 3 })} className={buyBtn}>
                      {busy === `t${b.id}` ? "Comprando…" : (<><Coin className="size-4" />{info?.price ?? 3}</>)}
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
