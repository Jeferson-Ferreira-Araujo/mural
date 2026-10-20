"use client";

import { useEffect, useRef, useState } from "react";
import { BADGES, badgeSrc, type BadgeInventory } from "@/lib/badges";
import { BADGE_CATEGORIES, BADGE_CATEGORY, NEW_BADGES_COUNT, STORE_DUPLICATES } from "@/lib/badgeCategories";
import { BOARDS, NEW_BOARDS } from "@/lib/boards";
import { BoardLightbox } from "./BoardLightbox";
import { CREDIT_PACKS, PAYMENTS_ENABLED } from "@/lib/plans";
import { startCheckout } from "@/lib/payments";
import { Modal } from "../account/Modal";
import { DisplayCard, type DisplayData } from "../messages/DisplayCard";
import { useBackClose } from "@/lib/backStack";
import { PAY_EVENT } from "@/lib/payments";
import { baseStyle, SHAPE_LABEL, withShape, type Shape } from "@/lib/displayShape";
import { DISPLAY_CATS, defaultStyle, isDisplayOn } from "../widgets";
import { GridSkeleton } from "../Skeleton";
import { useTranslations, useLocale } from "next-intl";
import { SAMPLE_TEXT, type DemoLocale } from "@/data/demoText";
import { useLit } from "@/i18n/literal";

export type BuyItem = { kind: "badge"; key: number; qty: number } | { kind: "unit"; key: number; qty: number } | { kind: "board"; id: string } | { kind: "product"; id: string } | { kind: "mural" };
type Tab = "pins" | "boards" | "formats";

const MAX_QTY = 20;

/** Escolhe quantas unidades comprar (− n +). */
function Qty({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const tx = useTranslations("components.badges.StoreModal");
  const b = "grid size-7 cursor-pointer place-items-center rounded-lg border border-[#d9c9ad] bg-white text-base font-bold leading-none text-[#4a3826] hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="mt-2 flex items-center justify-center gap-2">
      <button type="button" aria-label={tx("menosUma")} disabled={value <= 1} onClick={() => onChange(value - 1)} className={b}>
        −
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <button type="button" aria-label={tx("maisUma")} disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)} className={b}>
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

/** Amostra de cada pin da loja, como aparece no mural. */
export function sampleFor(product: string, style?: string, locale: DemoLocale = "pt"): DisplayData {
  const st = style || defaultStyle(product);
  const L = SAMPLE_TEXT[locale];
  switch (product) {
    case "bible":
      return { product, style: st, text: L.bibleText, ref: L.bibleRef };
    case "motivation":
      return { product, style: st, text: L.motivation };
    case "clock":
      return { product, style: st, tz: "America/Sao_Paulo" };
    case "calendar": {
      const n = new Date();
      const iso = (d: number) => `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { product, style: st, dates: [{ date: iso(Math.min(28, n.getDate() + 4)), label: L.birthday, yearly: true }, { date: iso(Math.min(28, n.getDate() + 11)), label: L.trip, yearly: true }] };
    }
    case "poll":
      return { product, style: st, title: L.poll, options: [L.yes, L.no] };
    case "top3":
      return { product, style: st, title: L.top3, items: L.food };
    case "book":
      return { product, style: st, title: L.book, pages: 96, read: 42, view: "both" };
    case "daycount": {
      const d = new Date();
      d.setDate(d.getDate() - 245);
      return { product, style: st, title: L.together, since: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` };
    }
    case "countdown": {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return { product, style: st, title: L.counter, target: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, time: "08:00" };
    }
    case "cookie":
    case "date":
      return { product, style: st };
    default:
      return { product: "weather", style: st, city: "São Paulo", lat: 0, lon: 0 };
  }
}

/** Reinicia uma animação CSS de um elemento (sem trocar a `key`, que deixava números antigos empilhados na tela). */
function replay(el: HTMLElement | null, animation: string) {
  if (!el) return;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = animation;
}

/** O saldo: um único número, que "pula" um pouco a cada compra. */
function Balance({ value, at, className }: { value: number; at: number; className: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (at) replay(ref.current, "buy-pop 0.6s ease");
  }, [at]);
  return (
    <strong ref={ref} translate="no" className={`notranslate ${className}`}>
      {value}
    </strong>
  );
}

/** "−N" que sobe e some ao lado do saldo, na hora da compra. */
function Spent({ at, spent, className }: { at: number; spent: number; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!at || spent <= 0) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 1700);
    return () => window.clearTimeout(t);
  }, [at, spent]);
  useEffect(() => {
    if (show) replay(ref.current, "float-up 1.6s ease-out forwards");
  }, [show, at]);
  return show ? (
    <span ref={ref} aria-hidden className={className}>
      −{spent}
    </span>
  ) : null;
}

type Done = { id: string; title: string; text: string; img?: string; spent: number; at: number };

/** Moeda do Pinz (public/img/moeda.webp). O tamanho vem do `className`. */
function Coin({ className = "size-6" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className={`shrink-0 select-none object-contain drop-shadow-[0_0.15rem_0.2rem_rgba(120,70,0,.35)] ${className}`} />;
}

/** Tamanho da moeda de cada pacote: quanto mais créditos, maior (e mais moedas). */
const COIN_SIZE = ["size-9", "size-10", "size-11", "size-12"];

/**
 * Loja do Pinz. Os pacotes de créditos ficam sempre à vista, no topo (a compra é no Mercado Pago).
 * Com créditos se compram Bottons (e unidades extras) e Fundos de mural. Mais de um mural é do PINZ+ (sem limite), não se vende.
 */
export function StoreModal({ open, onClose, inventory, onBuy }: { open: boolean; onClose: () => void; inventory: BadgeInventory | null; onBuy: (item: BuyItem) => Promise<boolean> }) {
  const tl = useLit();
  const tx = useTranslations("components.badges.StoreModal");
  const demoLocale = useLocale() as DemoLocale;
  const [tab, setTab] = useState<Tab>("pins");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // "all" | id da categoria
  const [page, setPage] = useState(0); // página da lista de bottons (9 por página, sem recarregar)
  const listTop = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState<Record<number, number>>({}); // quantas unidades o usuário escolheu comprar de cada pin
  const qtyOf = (key: number) => qty[key] ?? 1;
  const credits = inventory?.credits ?? 0;
  const byKey = new Map((inventory?.catalog ?? []).map((c) => [c.key, c]));
  // a loja mostra TODOS os bottons do site; quem já tem um compra só unidades extras
  const all = BADGES.filter((b) => byKey.has(b.key) && (!STORE_DUPLICATES.has(b.key) || byKey.get(b.key)!.owned));
  // os lançamentos mais recentes (maiores números) ganham o selo "Novo"
  const newKeys = new Set([...all].sort((a, b) => b.key - a.key).slice(0, NEW_BADGES_COUNT).map((b) => b.key));
  const [done, setDone] = useState<Done | null>(null);
  const [short, setShort] = useState<{ cost: number; name: string; offer?: boolean } | null>(null); // item que a pessoa quis comprar sem ter créditos suficientes
  const packs = useRef<HTMLElement>(null);
  // ordem: os novos antes (mais novo primeiro); depois os demais na ordem de sempre. Comprar não muda a posição do botton na lista
  const shown = (filter === "all" ? all : all.filter((b) => BADGE_CATEGORY[b.key] === filter)).slice().sort((a, b) => {
    const na = newKeys.has(a.key);
    const nb = newKeys.has(b.key);
    if (na !== nb) return na ? -1 : 1;
    return na ? b.key - a.key : 0;
  });
  const PER_PAGE = 9;
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const pageSafe = Math.min(page, pages - 1);
  const goPage = (n: number) => {
    setPage(n);
    window.setTimeout(() => listTop.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 30); // volta ao começo da lista; só ela troca, a loja não recarrega
  };
  const chips: { id: string; text: string }[] = [
    { id: "all", text: `Todos (${all.length})` },
    ...BADGE_CATEGORIES.map((c) => ({ id: c.id, text: c.label })),
  ];
  const boards = new Map((inventory?.boards ?? []).map((b) => [b.id, b]));
  const products = (inventory?.pinProducts ?? []).filter((p) => isDisplayOn(p.id.split(":")[0]));
  const [displayCat, setDisplayCat] = useState<string | null>(null); // tipo de display aberto na aba Displays
  const [shapePick, setShapePick] = useState<Record<string, Shape>>({}); // formato escolhido em cada cartão de estilo (retangular por padrão)

  const [viewBoard, setViewBoard] = useState<{ image: string; name: string } | null>(null); // mural aberto em tela cheia
  // voltar (Android) desfaz uma etapa da Loja por vez: primeiro o mural ampliado, depois o tipo de display aberto; só então fecha a Loja (a janela já cuida disso)
  useBackClose(!!viewBoard, () => setViewBoard(null));
  useBackClose(!!displayCat, () => setDisplayCat(null));
  // a comemoração some depois de alguns segundos
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 5000);
    return () => clearTimeout(t);
  }, [done]);

  async function buy(id: string, item: BuyItem, win: { title: string; text: string; img?: string; spent: number }) {
    // sem créditos suficientes: o botão continua ativo e avisa, com o caminho para adquirir créditos
    if (credits < win.spent) {
      setShort({ cost: win.spent, name: win.title });
      return;
    }
    setBusy(id);
    const ok = await onBuy(item);
    setBusy(null);
    if (ok) {
      setDone({ id, ...win, at: Date.now() });
      if (item.kind === "badge" || item.kind === "unit") setQty((q) => ({ ...q, [item.key]: 1 })); // depois de comprar, volta para 1 unidade
    }
  }
  function buyCredits(id: string) {
    window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: `credits:${id}` } })); // a janela de pagamento (Pix ou cartão) abre por cima da loja
  }
  const can = (cost: number) => credits >= cost;
  const sug = CREDIT_PACKS.find((p) => p.id === "c29") ?? CREDIT_PACKS[CREDIT_PACKS.length - 1]; // pacote sugerido no aviso de créditos insuficientes (R$ 25)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tx("loja")}
      xl
      aside={
        // os créditos ficam sempre no cabeçalho, ao lado do botão de fechar: dá para ver o saldo sendo gasto
        <p className="relative flex items-center gap-1.5 rounded-full border border-[#ecd9a0] bg-[#fff4cc] py-1 pr-3 pl-1.5" aria-label={tx("m_seuSaldoCreditos", { v0: credits })}>
          <Coin className="size-6" />
          <Balance value={credits} at={done?.at ?? 0} className="inline-block text-base tabular-nums" />
          <Spent at={done?.at ?? 0} spent={done?.spent ?? 0} className="pointer-events-none absolute top-full right-2 mt-0.5 text-sm font-bold text-[#c0392b]" />
        </p>
      }
    >
      {/* créditos e pacotes: sempre à vista, sem entrar em outra aba */}
      <section ref={packs} aria-label={tx("comprarCreditos")} className="mb-5 overflow-hidden rounded-3xl border border-[#ecd9a0] bg-gradient-to-b from-[#fff4cc] to-[#fff9e6]">
        <header className="flex items-center gap-3 border-b border-[#ecd9a0]/70 px-4 py-3 sm:px-5">
          <Coin className="size-9 sm:size-10" />
          <h3 className="font-title text-2xl font-semibold">{tx("pacotesDeCredito")}</h3>
          {!PAYMENTS_ENABLED && <span className="text-xs text-[#6b5440]">{tx("compraDeCreditosEmBreve")}</span>}
        </header>
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pt-5 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:overflow-visible sm:p-4 [&::-webkit-scrollbar]:hidden">
          {CREDIT_PACKS.map((p, i) => (
            <li key={p.id} className="relative flex w-[68%] shrink-0 snap-center flex-col items-center rounded-2xl sm:w-auto border border-[#e8d9b0] bg-white px-3 pt-5 pb-3 text-center shadow-[0_0.2rem_0.6rem_rgba(120,80,0,.08)]">
              {p.note && <span className="absolute -top-2.5 rounded-full bg-[#2f9e5a] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">{p.note}</span>}
              {/* moeda e quantidade lado a lado; preço e botão lado a lado: cartão baixo */}
              <div className="flex items-center justify-center gap-2.5">
                <Coin className={COIN_SIZE[i] ?? "size-10"} />
                <p className="text-left leading-none">
                  <span className="font-title block text-3xl font-semibold">{p.credits}</span>
                  <span className="text-xs text-[#8a7b69]">{tx("creditos")}</span>
                </p>
              </div>
              <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-2">
                <p className="text-lg font-bold whitespace-nowrap">{p.price}</p>
                <button type="button" disabled={!PAYMENTS_ENABLED || busy !== null} onClick={() => void buyCredits(p.id)} className="grow cursor-pointer rounded-xl bg-[#f6c93f] px-4 py-2 text-sm font-bold text-[#3a2a08] transition hover:bg-[#fad45a] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">
                  {!PAYMENTS_ENABLED ? tl("Em breve") : busy === `credits:${p.id}` ? tl("Abrindo…") : tl("Comprar")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* conta FREE: atalho para assinar o PINZ+ mensal */}
      {inventory && !inventory.plus && PAYMENTS_ENABLED && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: "plus" } }))}
          className="mb-5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-4 py-3 text-left text-[#3a2300] shadow-[0_0.2rem_0.7rem_rgba(150,90,0,.35)] transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
        >
          <span>
            <span className="block text-base font-extrabold">{tx("assinarPinz")}</span>
            <span className="block text-xs font-semibold opacity-80">{tx("pinsEDisplaysSemLimite")}</span>
          </span>
          <span className="shrink-0 rounded-lg bg-[#3a2300] px-3 py-1.5 text-sm font-bold text-[#fff4cc]">{tx("r990Mes")}</span>
        </button>
      )}

      <div role="tablist" aria-label={tx("loja")} className="mb-4 grid grid-cols-3 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {(
          [
            ["pins", tl("Bottons")],
            ["boards", tl("Murais")],
            ["formats", tl("Displays")],
          ] as const
        ).map(([id, text]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
            {text}
          </button>
        ))}
      </div>

      {!inventory ? (
        <GridSkeleton count={9} label={tx("carregandoALoja")} />
      ) : tab === "pins" ? (
        <>
          <div role="tablist" aria-label={tx("categoriasDeBottons")} className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {chips.map((c) => (
              <button key={c.id} role="tab" type="button" aria-selected={filter === c.id} onClick={() => (setFilter(c.id), setPage(0))} className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${filter === c.id ? "border-[#1f232b] bg-[#1f232b] text-white" : "border-[#e1d3ba] bg-white/70 text-[#4a3826] hover:bg-[#efe4cf]"}`}>
                {c.text}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b5440]">{tx("nenhumBottonNestaCategoriaAinda")}</p>
          ) : (
            <>
            <div ref={listTop} className="scroll-mt-2" />
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {shown.slice(pageSafe * PER_PAGE, pageSafe * PER_PAGE + PER_PAGE).map((b) => {
                const c = byKey.get(b.key)!;
                const owned = c.starter || c.owned;
                const n = qtyOf(b.key);
                const cost = owned ? c.unitPrice * n : c.price + c.unitPrice * (n - 1);
                const name = b.name ?? `Botton ${b.key}`;
                const just = done?.id === `p${b.key}`;
                return (
                  <li key={b.key} className={`relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition-colors ${just ? "border-[#3aa655] bg-[#effbf1] shadow-[0_0_0_3px_rgba(58,166,85,.35)]" : "border-[#e1d3ba] bg-white/70"}`} style={just ? { animation: "buy-pop 0.6s ease" } : undefined}>
                    {just && <Confetti key={done.at} />}
                    {!just && (
                      <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 rounded-full border border-[#ecd9a0] bg-[#fff4cc] py-px pr-1.5 pl-1 text-[11px] font-extrabold text-[#5a3d00] shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.2)]" aria-hidden>
                        <Coin className="size-3.5" />
                        {cost}
                      </span>
                    )}
                    {newKeys.has(b.key) && <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-[#e8554a] px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white uppercase shadow-[0_0.1rem_0.3rem_rgba(0,0,0,.3)]">{tx("novo")}</span>}
                    <div className="grid h-16 w-full place-items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={badgeSrc(b.key)} alt="" draggable={false} className="max-h-14 max-w-14 select-none" style={{ filter: "drop-shadow(0 2px 3px rgba(60,30,0,.4))", animation: just ? "buy-wiggle 0.9s ease" : undefined }} />
                    </div>
                    <p className="mt-1 w-full truncate text-xs font-semibold">{name}</p>
                    <Qty value={n} onChange={(v) => setQty((q) => ({ ...q, [b.key]: v }))} label={`Quantidade de ${name}`} />
                    {just ? (
                      <p className="mt-2 w-full rounded-lg bg-[#3aa655] px-2 py-1.5 text-xs font-bold text-white">{tx("comprado")}</p>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === `p${b.key}`}
                        aria-label={tx("m_porCredito", { v0: owned ? "Comprar mais " + n + " de" : tl("Comprar"), v1: name, v2: cost, v3: cost > 1 ? "s" : "" })}
                        onClick={() =>
                          buy(
                            `p${b.key}`,
                            owned ? { kind: "unit", key: b.key, qty: n } : { kind: "badge", key: b.key, qty: n },
                            {
                              title: name,
                              text: owned ? tx("m_unidadeJaDisponivelNaSua", { v0: n, v1: n > 1 ? "s" : "", v2: n > 1 ? "s" : "" }) : n > 1 ? tx("m_liberadoComUnidadesJaEsta", { v0: n }) : tx("m_liberadoJaEstaNaSua"),
                              img: badgeSrc(b.key),
                              spent: cost,
                            },
                          )
                        }
                        className={`${buyBtn} !gap-1 !px-1.5 !text-xs`}
                      >
                        {busy === `p${b.key}` ? (
                          tl("Comprando…")
                        ) : (
                          tl("Comprar")
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {pages > 1 && (
              <nav aria-label={tx("paginasDeBottons")} className="mt-4 flex items-center justify-center gap-3">
                <button type="button" disabled={pageSafe === 0} onClick={() => goPage(pageSafe - 1)} className="cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-40">
                  {tx("anterior")}</button>
                <span className="text-sm font-semibold tabular-nums text-[#6b5440]">
                  {tx("x_de", { v0: pageSafe + 1, v1: pages })}
                </span>
                <button type="button" disabled={pageSafe >= pages - 1} onClick={() => goPage(pageSafe + 1)} className="cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-40">
                  {tx("proxima")}</button>
              </nav>
            )}
            </>
          )}
        </>
      ) : tab === "formats" && !displayCat ? (
        // 1º passo: o tipo de display (cada estilo é vendido separadamente, dentro do tipo)
        <ul className="grid gap-3 sm:grid-cols-2" aria-label={tx("tiposDeDisplay")}>
          {DISPLAY_CATS.filter((c) => isDisplayOn(c.id)).map((c) => {
            const items = products.filter((p) => p.id.startsWith(c.id + ":"));
            const styles = new Set(items.map((p) => baseStyle(p.id.split(":")[1]))).size; // estilos diferentes (retangular e quadrado do mesmo estilo contam uma vez)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setDisplayCat(c.id)}
                  className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#e1d3ba] bg-white/70 text-left transition hover:border-[#d98a2b] hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]"
                >
                  <span className="grid place-items-center bg-[#e9d8b6]/70 px-4 py-5">
                    <span className="pointer-events-none text-[9px]">
                      <span className="relative block">
                        <DisplayCard data={sampleFor(c.id, undefined, demoLocale)} preview />
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 p-3">
                    <span className="font-title text-base font-semibold">{c.label}</span>
                    <span className="text-xs font-semibold text-[#6b5440]">
                      {styles} {styles === 1 ? "estilo" : "estilos"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {products.length === 0 && <li className="col-span-full py-6 text-center text-sm text-[#6b5440]">{tx("emBreveNovosDisplaysPor")}</li>}
        </ul>
      ) : tab === "formats" ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button type="button" onClick={() => setDisplayCat(null)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4a3826] hover:bg-black/5">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              {tx("x_displays")}</button>
            <h3 className="font-title text-base font-semibold">{DISPLAY_CATS.find((c) => c.id === displayCat)?.label}</h3>
          </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(() => {
            // um cartão por estilo; o formato (retangular ou quadrado) é escolhido no próprio cartão
            const inCat = products.filter((p) => p.id.startsWith(displayCat + ":"));
            const bases = [...new Set(inCat.map((p) => baseStyle(p.id.split(":")[1])))];
            return bases.map((base) => {
              const key = `${displayCat}:${base}`;
              const shapes = (["wide", "square", "tall"] as const).filter((sh) => inCat.some((p) => p.id === `${displayCat}:${withShape(base, sh)}`));
              const shape = shapes.includes(shapePick[key] ?? "wide") ? (shapePick[key] ?? "wide") : shapes[0];
              const p = inCat.find((x) => x.id === `${displayCat}:${withShape(base, shape)}`);
              if (!p) return null;
              const just = done?.id === `f${p.id}`;
              const name = p.name.replace(/ \(quadrado\)$/i, "");
              return (
                <li key={key} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white/70 ${just ? "border-[#3aa655] shadow-[0_0_0_3px_rgba(58,166,85,.35)]" : "border-[#e1d3ba]"}`} style={just ? { animation: "buy-pop 0.6s ease" } : undefined}>
                  {just && <Confetti key={done.at} />}
                  {/* amostra do pin: o cartão como aparece no mural, no formato escolhido */}
                  <div className="grid min-h-[11.5rem] place-items-center bg-[#e9d8b6]/70 px-4 py-6">
                    <div className="text-[9px]">
                      <div className="relative">
                        <DisplayCard data={sampleFor(displayCat ?? "", p.id.split(":")[1], demoLocale)} preview />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-title text-base font-semibold">{name}</p>
                      {p.owned ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e3f3e7] px-2.5 py-1 text-xs font-bold text-[#2f6a3c]">{p.price === 0 ? tx("m_gratis") : tl("✓ Comprado")}</span>
                      ) : (
                        <p className="flex items-center gap-1 text-sm font-bold" aria-label={tx("m_creditos", { v0: p.price })}>
                          <Coin className="size-5" />
                          {p.price}
                        </p>
                      )}
                    </div>
                    {shapes.length > 1 && (
                      <div role="radiogroup" aria-label={tx("formato")} className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-[#e1d3ba] bg-white/60 p-0.5">
                        {shapes.map((sh) => (
                          <button key={sh} type="button" role="radio" aria-checked={shape === sh} onClick={() => setShapePick((m) => ({ ...m, [key]: sh }))} className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${shape === sh ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
                            {SHAPE_LABEL[sh]}
                          </button>
                        ))}
                      </div>
                    )}
                    {!p.owned && (
                      <button type="button" disabled={busy === `f${p.id}`} onClick={() => buy(`f${p.id}`, { kind: "product", id: p.id }, { title: name + (shape === "square" ? " (quadrado)" : ""), text: tx("m_liberadoJaEstaNaEscolha"), spent: p.price })} className={`${buyBtn} mt-2`}>
                        {busy === `f${p.id}` ? tl("Comprando…") : tl("Comprar")}
                      </button>
                    )}
                  </div>
                </li>
              );
            });
          })()}
        </ul>
        </>
) : (
        <>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...BOARDS]
            // os que ainda não são seus primeiro; entre eles (e entre os seus) os lançamentos mais novos vêm antes
            .sort((a, b) => {
              const oa = boards.get(a.id)?.owned ?? a.id === "cortica";
              const ob = boards.get(b.id)?.owned ?? b.id === "cortica";
              if (oa !== ob) return oa ? 1 : -1;
              const na = NEW_BOARDS.indexOf(a.id);
              const nb = NEW_BOARDS.indexOf(b.id);
              if ((na >= 0) !== (nb >= 0)) return na >= 0 ? -1 : 1;
              return na >= 0 ? na - nb : BOARDS.indexOf(a) - BOARDS.indexOf(b);
            })
            .map((b) => {
            const info = boards.get(b.id);
            const owned = info?.owned ?? b.id === "cortica";
            const just = done?.id === `t${b.id}`;
            return (
              <li key={b.id} className={`relative overflow-hidden rounded-2xl border bg-white/70 ${just ? "border-[#3aa655] shadow-[0_0_0_3px_rgba(58,166,85,.35)]" : "border-[#e1d3ba]"}`} style={just ? { animation: "buy-pop 0.6s ease" } : undefined}>
                {just && <Confetti key={done.at} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image} alt={`Fundo ${b.name}`} className="aspect-[3/2] w-full object-cover" draggable={false} />
                  {/* ver o mural em tela cheia (discreto, no centro da foto) */}
                  <button
                    type="button"
                    onClick={() => setViewBoard({ image: b.image, name: b.name })}
                    aria-label={tx("m_verOMuralEmTela", { v0: b.name })}
                    title={tx("verEmTelaCheia")}
                    className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 text-white/90 opacity-80 backdrop-blur-sm transition hover:bg-black/65 hover:opacity-100 active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  {NEW_BOARDS.includes(b.id) && <span className="absolute top-2 left-2 rounded-full bg-[#e8554a] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white uppercase shadow-[0_0.15rem_0.4rem_rgba(0,0,0,.35)]">{tx("novo")}</span>}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-title text-base font-semibold">{b.name}</p>
                    {!owned ? (
                      <p className="flex items-center gap-1 text-sm font-bold" aria-label={tx("m_creditos", { v0: info?.price ?? 25 })}>
                        <Coin className="size-5" />
                        {info?.price ?? 25}
                      </p>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e3f3e7] px-2.5 py-1 text-xs font-bold text-[#2f6a3c]">
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                        {b.id === "cortica" ? tx("m_padrao") : tl("Comprado")}
                      </span>
                    )}
                  </div>
                  {owned ? null : (
                    <button type="button" disabled={busy === `t${b.id}`} onClick={() => buy(`t${b.id}`, { kind: "board", id: b.id }, { title: `Fundo ${b.name}`, text: tx("m_liberadoApliqueEmEditarMural"), img: b.image, spent: info?.price ?? 25 })} className={buyBtn}>
                      {busy === `t${b.id}` ? tl("Comprando…") : tl("Comprar")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
      <BoardLightbox image={viewBoard?.image ?? null} name={viewBoard?.name ?? ""} onClose={() => setViewBoard(null)} />

      {short && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          aria-label={tx("creditosInsuficientes")}
          onClose={() => setShort(null)}
          onClick={(e) => e.target === e.currentTarget && setShort(null)}
          className="m-auto w-[min(92vw,22rem)] max-w-none overflow-visible rounded-3xl border-0 bg-transparent p-0 backdrop:bg-[#2a1c12]/65 backdrop:backdrop-blur-sm"
        >
          {short.offer ? (
            // sugestão no próprio aviso: o pacote de R$ 25 (o mais vendido), para a pessoa ter ideia do quanto dá para comprar
            <div className="rounded-3xl border border-[#ecd9a0] bg-[#fffaf0] p-5 text-center text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
              <h2 className="font-title text-2xl leading-tight font-semibold">{tx("queTalEstePacote")}</h2>
              <div className="relative mt-4 rounded-2xl border border-[#e8d9b0] bg-white px-4 pt-5 pb-4">
                {sug.note && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#2f9e5a] px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-white shadow-sm">{sug.note}</span>}
                <div className="flex items-center justify-center gap-3">
                  <Coin className="size-14" />
                  <p className="text-left leading-none">
                    <span className="font-title block text-4xl font-semibold">{sug.credits}</span>
                    <span className="text-sm text-[#8a7b69]">{tx("creditos")}</span>
                  </p>
                </div>
                <p className="mt-3 text-2xl font-bold">{sug.price}</p>
              </div>
              <p className="mt-3 text-sm text-[#4a3826]">{tx("x_comCreditosVoceLevaBastante", { v0: sug.credits })}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setShort(null)} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                  {tx("agoraNao")}</button>
                <button
                  type="button"
                  disabled={!PAYMENTS_ENABLED}
                  onClick={() => {
                    setShort(null);
                    buyCredits(sug.id);
                  }}
                  className="flex-1 cursor-pointer rounded-xl bg-[#f6c93f] px-4 py-2.5 text-sm font-bold text-[#3a2a08] hover:bg-[#fad45a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PAYMENTS_ENABLED ? tl("Comprar") : tl("Em breve")}
                </button>
              </div>
            </div>
          ) : (
          <div className="rounded-3xl border border-[#ecd9a0] bg-[#fffaf0] p-5 text-center text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
            <Coin className="mx-auto size-14" />
            <h2 className="font-title mt-3 text-2xl leading-tight font-semibold">{tx("creditosInsuficientes")}</h2>
            <p className="mt-2 text-sm text-[#4a3826]">
              {tx.rich("x_voceNaoTemCreditoSuficiente", { v0: short.name, v1: short.cost - credits, v2: short.cost - credits === 1 ? tx("m_credito") : tx("m_creditos2"), s0: (c) => <strong>{c}</strong>, s1: (c) => <strong>{c}</strong> })}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShort(null)} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                {tx("agoraNao")}</button>
              <button
                type="button"
                onClick={() => setShort({ ...short, offer: true })}
                className="flex-1 cursor-pointer rounded-xl bg-[#f6c93f] px-4 py-2.5 text-sm font-bold text-[#3a2a08] hover:bg-[#fad45a]"
              >
                {tx("adquirirCreditos")}</button>
            </div>
          </div>
          )}
        </dialog>
      )}
    </Modal>
  );
}
