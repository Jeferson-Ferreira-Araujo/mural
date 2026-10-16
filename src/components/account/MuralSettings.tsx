"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { PAY_EVENT } from "@/lib/payments";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";

/** Editar o mural: tipo (fundo), nome e excluir. Público/privado e a pergunta de segurança são do PERFIL (Perfil → Privacidade). */
export function MuralSettings({ mural, onSaved, onDeleted, canDelete = true }: { mural: OwnMural; onSaved: () => void; onDeleted: () => void; /** o primeiro mural da conta nunca pode ser excluído */ canDelete?: boolean }) {
  const [title, setTitle] = useState(mural.title);
  const plus = mural.plan === "full";
  const [welcome, setWelcome] = useState(mural.welcome_message ?? ""); // mensagem que a pessoa vê ao entrar no mural (só PINZ+)
  const [welcomeOn, setWelcomeOn] = useState(!!mural.welcome_message?.trim()); // caixa marcada = o campo de texto aparece; desmarcada = sem mensagem (apaga a que existia)
  const strip = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0); // qual fundo está à vista (para os pontinhos)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [board, setBoard] = useState("");
  const [currentBoard, setCurrentBoard] = useState("");

  useEffect(() => {
    setTitle(mural.title);
    setWelcome(mural.welcome_message ?? "");
    setWelcomeOn(!!mural.welcome_message?.trim());
  }, [mural.id, mural.title, mural.welcome_message]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    void fetchInventory(sb).then((inv) => setOffers(inv?.boards ?? []));
    void sb
      .from("murals")
      .select("board")
      .eq("id", mural.id)
      .maybeSingle()
      .then(({ data }) => {
        const b = (data as { board: string } | null)?.board ?? "cortica";
        setBoard(b);
        setCurrentBoard(b);
      });
  }, [mural.id]);

  // só os tipos que a pessoa já tem (mais o que o mural usa agora, por garantia)
  const selectable = BOARDS.filter((b) => b.id === "cortica" || b.id === currentBoard || offers.find((o) => o.id === b.id)?.owned === true);

  // ao abrir (e quando o tipo do mural chega do servidor), o slide já mostra o tipo em uso
  useEffect(() => {
    const el = strip.current;
    const i = selectable.findIndex((b) => b.id === currentBoard);
    if (el && i >= 0) {
      el.scrollTo({ left: i * el.clientWidth });
      setSlide(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBoard, selectable.length]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg({ ok: false, text: "Preencha o nome do mural." });
      return;
    }
    setBusy(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim() });
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: "Não foi possível salvar. Confira os campos e tente de novo." });
      return;
    }
    if (board && board !== currentBoard) {
      const { error: eb } = await sb.rpc("set_mural_board", { p_mural_id: mural.id, p_board: board });
      if (eb) {
        setBusy(false);
        setMsg({ ok: false, text: "Salvei o nome, mas não foi possível trocar o tipo (compre-o na loja)." });
        return;
      }
      setCurrentBoard(board);
    }
    // mensagem de boas-vindas (PINZ+): vazia apaga
    const wanted = welcomeOn ? welcome : "";
    if (plus && wanted.trim() !== (mural.welcome_message ?? "").trim()) {
      const { error: ew } = await sb.rpc("set_welcome_message", { p_mural_id: mural.id, p_text: wanted });
      if (ew) {
        setBusy(false);
        setMsg({ ok: false, text: "Salvei o resto, mas não foi possível salvar a mensagem de boas-vindas. Ela pode ter até 280 letras." });
        return;
      }
    }
    setBusy(false);
    onSaved();
  }

  async function reset() {
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("reset_mural", { p_id: mural.id });
    setBusy(false);
    setConfirmReset(false);
    if (error) {
      setMsg({ ok: false, text: "Não foi possível resetar o mural. Tente de novo." });
      return;
    }
    setMsg({ ok: true, text: "Mural resetado. Todos os recados foram apagados." });
    window.dispatchEvent(new Event("pinz:reload-board"));
    onSaved();
  }

  async function remove() {
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("delete_mural", { p_id: mural.id });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: "Não foi possível excluir. Tente de novo." });
      return;
    }
    onDeleted();
  }

  return (
    <div>
      <form onSubmit={save} className="space-y-4" noValidate>
        <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
          <legend className="mb-2 text-sm font-semibold">Tipo do mural</legend>
          <div className="relative">
            <div
              ref={strip}
              role="radiogroup"
              aria-label="Tipo do mural"
              onScroll={(e) => {
                // o tipo que está à vista no carrossel é o escolhido (sem botão de selecionar)
                const i = Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1));
                setSlide(i);
                const bd = selectable[i];
                if (bd) setBoard(bd.id);
              }}
              className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl shadow-[0_0.5rem_1.4rem_rgba(60,35,10,.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {selectable.map((bd) => {
                const on = board === bd.id;
                return (
                  <div key={bd.id} role="radio" aria-checked={on} aria-label={bd.name} className="relative block w-full shrink-0 snap-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bd.image} alt="" draggable={false} className="aspect-[3/2] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-3">
                      <span className="min-w-0 truncate text-base font-bold text-white">{bd.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectable.length > 1 &&
              ([-1, 1] as const).map((d) => (
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
          {selectable.length > 1 && (
            <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
              {selectable.map((bd, i) => (
                <span key={bd.id} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-[#d9a21b]" : "w-1.5 bg-[#cdbb97]"}`} />
              ))}
            </div>
          )}
        </fieldset>

        <Field label="Nome do mural">{(fid) => <input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />}</Field>

        <div>
          <label className={`flex items-center gap-2.5 text-sm font-semibold ${plus ? "cursor-pointer" : "opacity-80"}`}>
            <input
              type="checkbox"
              checked={plus && welcomeOn}
              onChange={(e) => {
                if (!plus) return window.dispatchEvent(new CustomEvent(PAY_EVENT, { detail: { product: "plus" } }));
                setWelcomeOn(e.target.checked);
              }}
              className="size-5 cursor-pointer accent-[#d98a2b]"
            />
            <span>Mensagem de boas-vindas</span>
            {!plus && <span className="rounded-md bg-gradient-to-r from-[#f2c230] to-[#e39a1c] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-[#3a2300] uppercase">PINZ+</span>}
          </label>
          {plus && welcomeOn && (
            <div className="mt-2">
              <textarea
                id="mural-welcome"
                aria-label="Mensagem de boas-vindas"
                value={welcome}
                onChange={(e) => setWelcome(e.target.value.slice(0, 280))}
                rows={4}
                maxLength={280}
                placeholder="Um recado que aparece para quem entrar no seu mural (depois de acertar a resposta)"
                className={`${inputClass} resize-none`}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-[#8a7b69]">
                <span>Aparece como uma janela quando a pessoa entra.</span>
                <span className="tabular-nums">{welcome.length}/280</span>
              </div>
            </div>
          )}
        </div>

        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </form>

      {/* resetar: apaga todos os recados do mural (os bottons e displays ficam) */}
      <div className="mt-6 border-t border-[#e1d3ba] pt-4">
        {confirmReset ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm font-semibold text-[#6b2a1c]">Resetar este mural?</p>
            <p className="mt-1 text-sm text-[#6b2a1c]">Todos os recados (pins) serão perdidos. Isso não pode ser desfeito.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={reset} disabled={busy} className="cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a3123] disabled:opacity-60">
                {busy ? "Resetando…" : "Sim, resetar"}
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} disabled={busy} className={`${ghostButton} !px-4 !py-2 text-sm`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="w-full cursor-pointer rounded-xl border border-[#e3b3a8] bg-white/60 px-4 py-3 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
            Resetar mural
          </button>
        )}
      </div>

      {/* o primeiro mural nunca pode ser excluído: nesse caso a área nem aparece */}
      <div className={`mt-4 ${canDelete ? "" : "hidden"}`}>
        {!canDelete ? null : confirmDelete ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm text-[#6b2a1c]">Excluir este mural apaga também os acessos e todas as mensagens dele. Isso não pode ser desfeito.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={remove} disabled={busy} className="cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8a3123] disabled:opacity-60">
                Sim, excluir
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={`${ghostButton} !px-4 !py-2 text-sm`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full cursor-pointer rounded-xl border border-[#e3b3a8] bg-white/60 px-4 py-3 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#fbeae5]">
            Excluir este mural
          </button>
        )}
      </div>
    </div>
  );
}
