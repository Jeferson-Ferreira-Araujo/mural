"use client";

import { useEffect, useRef, useState } from "react";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { buyBoard, fetchInventory, type BoardOffer } from "@/lib/badges";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

function Coin({ className = "size-5" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className={`shrink-0 select-none object-contain ${className}`} />;
}

/** Novo mural (PINZ PLUS): nome e tipo (fundo). Os tipos não comprados aparecem com o botão de comprar; depois de comprar, voltam aqui já selecionados. */
export function NewMuralModal({ open, onClose, nick, onBought }: { open: boolean; onClose: () => void; nick: string; /** a loja mudou (créditos/tipos): recarrega o inventário da tela */ onBought?: () => void }) {
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [credits, setCredits] = useState(0);
  const [preview, setPreview] = useState<string | null>(null); // tipo aberto em destaque (olhinho)
  const [buying, setBuying] = useState<string | null>(null); // tipo que a pessoa quer comprar (pede confirmação)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const slide = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  const load = () =>
    fetchInventory(getBrowserSupabase()).then((inv) => {
      setOffers(inv?.boards ?? []);
      setCredits(inv?.credits ?? 0);
    });

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBoard(DEFAULT_BOARD);
    setBuying(null);
    setPreview(null);
    setError(null);
    void load();
  }, [open]);

  const owns = (id: string) => id === DEFAULT_BOARD || offers.find((o) => o.id === id)?.owned === true;
  const priceOf = (id: string) => offers.find((o) => o.id === id)?.price ?? 25;

  function startBuy(id: string) {
    setError(null);
    setBuying(id);
  }
  function cancelBuy() {
    setError(null);
    setBuying(null);
  }

  async function confirmBuy() {
    if (!buying || busy) return;
    setBusy(true);
    setError(null);
    const res = await buyBoard(getBrowserSupabase(), buying);
    if (!res.ok) {
      setBusy(false);
      setError(res.reason === "no_credits" ? "Créditos insuficientes para este mural." : res.reason === "plus_required" ? "A compra de murais é do PINZ PLUS." : "Não foi possível comprar agora. Tente de novo.");
      return;
    }
    await load();
    onBought?.();
    setBoard(buying); // volta para a criação já com o mural comprado selecionado
    setBuying(null);
    setBusy(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { data, error: err } = await sb.rpc("create_mural", { p_title: title.trim(), p_question: "", p_answer: "" });
    const created = data as { slug?: string; id?: string } | null;
    if (err || !created?.slug || !created.id) {
      setBusy(false);
      setError(err?.message.includes("mural_limit") ? "Você chegou ao limite de murais." : "Não foi possível criar o mural agora. Tente de novo.");
      return;
    }
    if (board !== DEFAULT_BOARD) {
      const { error: eb } = await sb.rpc("set_mural_board", { p_mural_id: created.id, p_board: board });
      if (eb) setError("O mural foi criado, mas não deu para aplicar o tipo escolhido. Troque em Editar mural.");
    }
    window.location.assign(`/${nick}/${created.slug}`); // abre o mural novo
  }

  const view = preview ? BOARDS.find((b) => b.id === preview) : null;
  const target = buying ? BOARDS.find((b) => b.id === buying) : null;
  const price = buying ? priceOf(buying) : 0;

  return (
    <Modal open={open} onClose={onClose} title="" label="Novo mural">
      {view && !target ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.image} alt={`Mural ${view.name}`} draggable={false} className="aspect-[3/2] w-full rounded-xl object-cover shadow" />
          <p className="text-center text-base font-semibold">{view.name}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreview(null)} className={`${ghostButton} flex-1`}>
              Voltar
            </button>
            {owns(view.id) ? (
              <button type="button" onClick={() => (setBoard(view.id), setPreview(null))} className={`${primaryButton} flex-1`}>
                Usar este
              </button>
            ) : (
              <button type="button" onClick={() => (setPreview(null), startBuy(view.id))} className={`${primaryButton} flex-1`}>
                Comprar · {priceOf(view.id)}
              </button>
            )}
          </div>
        </div>
      ) : target ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={target.image} alt="" draggable={false} className="mx-auto aspect-[3/2] w-48 rounded-xl object-cover shadow" />
          <p className="text-center text-base font-semibold">
            Comprar o mural “{target.name}” por <span className="whitespace-nowrap">{price} créditos</span>?
          </p>
          <p className="flex items-center justify-center gap-1.5 text-sm text-[#6b5440]">
            Você tem <Coin className="size-4" /> <strong>{credits}</strong>
            {credits < price ? ` · faltam ${price - credits}` : ""}
          </p>
          {error && (
            <p role="alert" className="text-center text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={cancelBuy} disabled={busy} className={`${ghostButton} flex-1`}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmBuy()} disabled={busy || credits < price} className={`${primaryButton} flex-1`}>
              {busy ? "Comprando…" : "Comprar"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-4" noValidate>
          <Field label="Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus placeholder="Ex: Viagem de 2026" className={inputClass} />}</Field>

          <fieldset className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Tipo de mural</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold" aria-label={`${credits} créditos`}>
                <Coin />
                {credits}
              </span>
            </div>
            <div className="relative">
            <div ref={strip} role="radiogroup" aria-label="Tipo de mural" className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
              {BOARDS.map((b) => {
                const id = b.id as string;
                const has = owns(id);
                const on = board === id;
                return (
                  <div key={id} className={`relative w-[8.5rem] shrink-0 snap-center rounded-xl border-2 p-1.5 text-center transition ${on ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.3rem_0.9rem_rgba(217,162,27,.35)] ring-2 ring-[#d9a21b]/40" : has ? "border-[#e1d3ba] bg-white" : "border-[#e1d3ba] bg-white/50"}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={!has}
                      onClick={() => setBoard(id)}
                      className={`block w-full ${has ? "cursor-pointer" : "cursor-default"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.image} alt="" draggable={false} className={`aspect-[3/2] w-full rounded-lg object-cover ${has ? "" : "opacity-60"}`} />
                      <span className="mt-1 flex items-center justify-between gap-1 px-0.5">
                        <span className="truncate text-sm font-semibold">{b.name}</span>
                        {!has && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-[#6b5440]">
                            <Coin className="size-3.5" />
                            {priceOf(id)}
                          </span>
                        )}
                      </span>
                    </button>
                    {on && (
                      <span aria-hidden className="absolute top-2.5 left-2.5 grid size-6 place-items-center rounded-full bg-[#d9a21b] text-[#2a1c12] shadow">
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    )}
                    {/* olhinho: abre o mural em tamanho grande para ver como ele é */}
                    <button
                      type="button"
                      onClick={() => setPreview(id)}
                      aria-label={`Ver o mural ${b.name} em detalhe`}
                      title="Ver em detalhe"
                      className="absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white shadow transition hover:bg-black/80 active:scale-90"
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    {has && (on ? (
                      <p className="mt-1.5 inline-flex w-full items-center justify-center rounded-lg bg-[#d9a21b] px-2 py-1.5 text-xs font-bold text-[#2a1c12]">Selecionado</p>
                    ) : (
                      <button type="button" onClick={() => setBoard(id)} className="mt-1.5 w-full cursor-pointer rounded-lg border border-[#c9b48a] bg-white px-2 py-1.5 text-xs font-bold text-[#2a1c12] transition hover:bg-[#fff6dd] active:scale-95">
                        Usar este
                      </button>
                    ))}
                    {!has && (
                      <button
                        type="button"
                        onClick={() => startBuy(id)}
                        className="mt-1.5 w-full cursor-pointer rounded-lg bg-[#17110c] px-2 py-1.5 text-xs font-bold text-white transition hover:bg-[#2b1c12] active:scale-95"
                      >
                        Comprar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* setas: no computador não há como deslizar com o dedo */}
            {([-1, 1] as const).map((d) => (
              <button key={d} type="button" onClick={() => slide(d)} aria-label={d < 0 ? "Tipos anteriores" : "Próximos tipos"} className={`absolute top-[2.6rem] z-10 hidden size-8 cursor-pointer place-items-center rounded-full bg-[#17110c]/85 text-white shadow transition hover:bg-[#2b1c12] active:scale-90 sm:grid ${d < 0 ? "-left-3" : "-right-3"}`}>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={d < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
                </svg>
              </button>
            ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !title.trim()} className={primaryButton}>
            {busy ? "Criando…" : "Criar mural"}
          </button>
        </form>
      )}
    </Modal>
  );
}
