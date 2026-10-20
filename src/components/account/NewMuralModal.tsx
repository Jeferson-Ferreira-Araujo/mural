"use client";

import { useEffect, useRef, useState } from "react";
import { BOARDS, DEFAULT_BOARD } from "@/lib/boards";
import { buyBoard, fetchInventory, type BoardOffer } from "@/lib/badges";
import { PinTtlField, type PinTtl } from "./PinTtlField";
import { PrivacyField, privacyError, type Privacy } from "./PrivacyField";
import { getProfilePrivacy } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

function Coin({ className = "size-5" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/moeda.webp" alt="" aria-hidden draggable={false} className={`shrink-0 select-none object-contain ${className}`} />;
}

/**
 * Novo mural (PINZ+), no mesmo modelo da edição: tipo em slide (os que ainda não são seus têm o botão Comprar) e nome.
 * Público ou privado é do perfil (Perfil → Privacidade): o mural novo já nasce com a mesma regra.
 */
export function NewMuralModal({ open, onClose, nick, onBought }: { open: boolean; onClose: () => void; nick: string; /** a loja mudou (créditos/tipos): recarrega o inventário da tela */ onBought?: () => void }) {
  const tl = useLit();
  const tx = useTranslations("components.account.NewMuralModal");
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState<string>(DEFAULT_BOARD);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [credits, setCredits] = useState(0);
  const [ttl, setTtl] = useState<PinTtl>(null);
  // pergunta de segurança do mural novo: já vem igual à do seu primeiro mural, e dá para mudar
  const [privacy, setPrivacy] = useState<Privacy>({ priv: false, question: "", answer: "" });
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
    setTtl(null);
    setPrivacy({ priv: false, question: "", answer: "" });
    void getProfilePrivacy(getBrowserSupabase()).then((p) => p && setPrivacy({ priv: p.private, question: p.question, answer: p.answer }));
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
      setError(res.reason === "no_credits" ? tx("m_creditosInsuficientesParaEsteMural") : res.reason === "plus_required" ? tx("m_comprarMuraisEParaQuem") : tx("m_naoFoiPossivelComprarAgora"));
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
    if (!title.trim()) return setError(tx("m_preenchaONomeDoMural"));
    const perr = privacyError(privacy, false);
    if (perr) return setError(tl(perr));
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { data, error: err } = await sb.rpc("create_mural", { p_title: title.trim(), p_question: "", p_answer: "", p_slots: 28 } /* o mural novo segue a privacidade do perfil */);
    const created = data as { slug?: string; id?: string } | null;
    if (err || !created?.slug || !created.id) {
      setBusy(false);
      setError(err?.message.includes("mural_limit") ? tx("m_voceChegouAoLimiteDe") : tx("m_naoFoiPossivelCriarO"));
      return;
    }
    if (board !== DEFAULT_BOARD) await sb.rpc("set_mural_board", { p_mural_id: created.id, p_board: board });
    await sb.rpc("set_mural_privacy", { p_mural_id: created.id, p_private: privacy.priv, p_question: privacy.priv ? privacy.question.trim() : "", p_answer: privacy.priv ? privacy.answer.trim() : null });
    if (ttl) await sb.rpc("set_mural_pin_ttl", { p_mural_id: created.id, p_days: ttl });
    window.location.assign(`/${nick}/${created.slug}`); // abre o mural novo
  }

  const target = buying ? BOARDS.find((b) => b.id === buying) : null;
  const price = buying ? priceOf(buying) : 0;

  return (
    <Modal open={open} onClose={onClose} title={tx("novoMural")} label={tx("novoMural")} wide>
      {target ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={target.image} alt="" draggable={false} className="mx-auto aspect-[3/2] w-56 rounded-xl object-cover shadow" />
          <p className="text-center text-base font-semibold">
            {tx.rich("x_comprarOMuralPorCreditos", { v0: target.name, v1: price, s0: (c) => <span className="whitespace-nowrap">{c}</span> })}</p>
          <p className="flex items-center justify-center gap-1.5 text-sm text-[#6b5440]">
            {tx.rich("x_voceTem", { v0: credits, v1: credits < price ? ` · faltam ${price - credits}` : "", n0: () => <Coin className="size-4" />, s1: (c) => <strong>{c}</strong> })}
          </p>
          {error && (
            <p role="alert" className="text-center text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => (setBuying(null), setError(null))} disabled={busy} className={`${ghostButton} flex-1`}>
              {tx("cancelar")}</button>
            <button type="button" onClick={() => void confirmBuy()} disabled={busy || credits < price} className={`${primaryButton} flex-1`}>
              {busy ? "Comprando…" : "Comprar"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-4" noValidate>
          <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{tx("tipoDoMural")}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" aria-label={tx("m_creditos", { v0: credits })}>
                <Coin />
                {credits}
              </span>
            </div>
            <div className="relative">
              <div
                ref={strip}
                role="radiogroup"
                aria-label={tx("tipoDoMural")}
                onScroll={(e) => {
                  // o tipo que está à vista no carrossel é o escolhido para criar (sem botão de selecionar)
                  const i = Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1));
                  setSlide(i);
                  const bd = BOARDS[i];
                  if (bd) setBoard(bd.id);
                }}
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
                            {tx.rich("x_comprar", { v0: priceOf(bd.id), n0: () => <Coin className="size-4" /> })}
                          </button>
                        ) : null}
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
                  aria-label={d < 0 ? "Tipo anterior" : tx("m_proximoTipo")}
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

          <Field label={tx("nomeDoMural")}>{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={tx("exViagemDe2026")} className={inputClass} />}</Field>
          <PrivacyField value={privacy} onChange={setPrivacy} />
          <PinTtlField value={ttl} onChange={setTtl} />


          {error && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !owns(board)} title={owns(board) ? undefined : tx("m_compreEsteTipoDeMural")} className={primaryButton}>
            {busy ? "Criando…" : tx("m_criarMural")}
          </button>
        </form>
      )}
    </Modal>
  );
}
