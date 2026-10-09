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

/**
 * Novo mural (PINZ+), no mesmo modelo da edição: tipo em slide (os que ainda não são seus têm o botão Comprar) e nome.
 * Público ou privado é do perfil (Perfil → Privacidade): o mural novo já nasce com a mesma regra.
 */
export function NewMuralModal({ open, onClose, nick, onBought }: { open: boolean; onClose: () => void; nick: string; /** a loja mudou (créditos/tipos): recarrega o inventário da tela */ onBought?: () => void }) {
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [credits, setCredits] = useState(0);
  const [buying, setBuying] = useState<string | null>(null); // tipo que a pessoa quer comprar (pede confirmação)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

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
    setSlide(0);
    setError(null);
    void load();
  }, [open]);

  const owns = (id: string) => id === DEFAULT_BOARD || offers.find((o) => o.id === id)?.owned === true;
  const priceOf = (id: string) => offers.find((o) => o.id === id)?.price ?? 25;

  // depois de comprar, o slide volta para o tipo comprado
  const scrollTo = (id: string) => {
    const i = BOARDS.findIndex((b) => b.id === id);
    window.setTimeout(() => {
      const el = strip.current;
      if (el && i >= 0) {
        el.scrollTo({ left: i * el.clientWidth });
        setSlide(i);
      }
    }, 50);
  };

  async function confirmBuy() {
    if (!buying || busy) return;
    setBusy(true);
    setError(null);
    const res = await buyBoard(getBrowserSupabase(), buying);
    if (!res.ok) {
      setBusy(false);
      setError(res.reason === "no_credits" ? "Créditos insuficientes para este mural." : res.reason === "plus_required" ? "Comprar murais é para quem assina o PINZ+." : "Não foi possível comprar agora. Tente de novo.");
      return;
    }
    await load();
    onBought?.();
    const bought = buying;
    setBoard(bought); // volta para a criação já com o mural comprado selecionado
    setBuying(null);
    setBusy(false);
    scrollTo(bought);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) return setError("Preencha o nome do mural.");
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { data, error: err } = await sb.rpc("create_mural", { p_title: title.trim(), p_question: "", p_answer: "" } /* o mural novo segue a privacidade do perfil */);
    const created = data as { slug?: string; id?: string } | null;
    if (err || !created?.slug || !created.id) {
      setBusy(false);
      setError(err?.message.includes("mural_limit") ? "Você chegou ao limite de murais." : "Não foi possível criar o mural agora. Tente de novo.");
      return;
    }
    if (board !== DEFAULT_BOARD) await sb.rpc("set_mural_board", { p_mural_id: created.id, p_board: board });
    window.location.assign(`/${nick}/${created.slug}`); // abre o mural novo
  }

  const target = buying ? BOARDS.find((b) => b.id === buying) : null;
  const price = buying ? priceOf(buying) : 0;

  return (
    <Modal open={open} onClose={onClose} title="" label="Novo mural" wide>
      {target ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={target.image} alt="" draggable={false} className="mx-auto aspect-[3/2] w-56 rounded-xl object-cover shadow" />
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
            <button type="button" onClick={() => (setBuying(null), setError(null))} disabled={busy} className={`${ghostButton} flex-1`}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmBuy()} disabled={busy || credits < price} className={`${primaryButton} flex-1`}>
              {busy ? "Comprando…" : "Comprar"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-4" noValidate>
          <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Tipo do mural</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" aria-label={`${credits} créditos`}>
                <Coin />
                {credits}
              </span>
            </div>
            <div className="relative">
              <div
                ref={strip}
                role="radiogroup"
                aria-label="Tipo do mural"
                onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1)))}
                className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-[0_0.5rem_1.4rem_rgba(60,35,10,.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {BOARDS.map((bd) => {
                  const has = owns(bd.id);
                  const on = board === bd.id;
                  return (
                    <div key={bd.id} role="radio" aria-checked={on} aria-label={bd.name} className="relative block w-full shrink-0 snap-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bd.image} alt="" draggable={false} className={`aspect-[3/2] w-full object-cover ${has ? "" : "opacity-70"}`} />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-3">
                        <span className="min-w-0 truncate text-base font-bold text-white">{bd.name}</span>
                        {!has ? (
                          <button
                            type="button"
                            onClick={() => (setError(null), setBuying(bd.id))}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-bold text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4)] transition hover:bg-white active:scale-95"
                          >
                            Comprar <Coin className="size-4" />
                            {priceOf(bd.id)}
                          </button>
                        ) : on ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f4c542] px-3.5 py-1.5 text-sm font-bold text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4)]">
                            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                            Selecionado
                          </span>
                        ) : (
                          <button type="button" onClick={() => setBoard(bd.id)} className="shrink-0 cursor-pointer rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-bold text-[#2a1c12] shadow-[0_0.2rem_0.6rem_rgba(0,0,0,.4)] transition hover:bg-white active:scale-95">
                            Selecionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {([-1, 1] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => strip.current?.scrollBy({ left: d * (strip.current?.clientWidth ?? 230), behavior: "smooth" })}
                  aria-label={d < 0 ? "Tipo anterior" : "Próximo tipo"}
                  className={`absolute top-1/2 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/85 text-[#2a1c12] shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.35)] backdrop-blur transition hover:bg-white active:scale-90 ${d < 0 ? "left-2" : "right-2"}`}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={d < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
                  </svg>
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
              {BOARDS.map((bd, i) => (
                <span key={bd.id} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-[#d9a21b]" : "w-1.5 bg-[#cdbb97]"}`} />
              ))}
            </div>
          </fieldset>

          <Field label="Nome do mural">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex: Viagem de 2026" className={inputClass} />}</Field>

          {error && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Criando…" : "Criar mural"}
          </button>
        </form>
      )}
    </Modal>
  );
}
