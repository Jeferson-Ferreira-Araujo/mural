"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { Field, ghostButton, inputClass, primaryButton } from "../ui";

/** Editar o mural: nome, pergunta (opcional: em branco = público), mensagem do mural vazio (PLUS) e excluir. */
export function MuralSettings({ mural, onSaved, onDeleted, canDelete = true }: { mural: OwnMural; onSaved: () => void; onDeleted: () => void ; /** o primeiro mural da conta nunca pode ser excluído */ canDelete?: boolean }) {
  const [title, setTitle] = useState(mural.title);
  const [question, setQuestion] = useState(mural.question);
  const [priv, setPriv] = useState(mural.question.trim() !== ""); // público ou privado (com pergunta de segurança)
  const [answer, setAnswer] = useState("");
  const strip = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0); // qual fundo está à vista (para os pontinhos)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [offers, setOffers] = useState<BoardOffer[]>([]);
  const [board, setBoard] = useState("");
  const [currentBoard, setCurrentBoard] = useState("");
  const [had, setHad] = useState(mural.question); // pergunta já salva (define se a resposta é nova)

  useEffect(() => {
    setTitle(mural.title);
    setQuestion(mural.question);
    setPriv(mural.question.trim() !== "");
    setHad(mural.question);
  }, [mural.id, mural.title, mural.question]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    void fetchInventory(sb).then((inv) => setOffers(inv?.boards ?? []));
    void sb.from("murals").select("board").eq("id", mural.id).maybeSingle().then(({ data }) => {
      const b = (data as { board: string } | null)?.board ?? "cortica";
      setBoard(b);
      setCurrentBoard(b);
    });
  }, [mural.id]);

  // a resposta é pedida quando o mural passa a ter pergunta (era público) ou quando a pessoa escolhe trocá-la
  const answerFilled = answer.trim() !== ""; // resposta digitada (troca a atual); em branco mantém a que já existe

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
    const q = priv ? question.trim() : ""; // público = sem pergunta
    if (!title.trim() || (priv && q.length < 3)) {
      setMsg({ ok: false, text: !title.trim() ? "Preencha o nome do mural." : q === "" ? "Escreva a pergunta de segurança." : "A pergunta precisa ter pelo menos 3 letras." });
      return;
    }
    if (q !== "" && !had.trim() && !answerFilled) {
      setMsg({ ok: false, text: "Digite a resposta." });
      return;
    }
    setBusy(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim(), p_question: q, p_answer: q !== "" && answerFilled ? answer.trim() : null });
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: "Não foi possível salvar. Confira os campos e tente de novo." });
      return;
    }
    if (board && board !== currentBoard) {
      const { error: eb } = await sb.rpc("set_mural_board", { p_mural_id: mural.id, p_board: board });
      if (eb) {
        setBusy(false);
        setMsg({ ok: false, text: "Salvei o resto, mas não foi possível trocar o tema (compre-o na loja)." });
        return;
      }
      setCurrentBoard(board);
    }
    setBusy(false);
    setMsg({ ok: true, text: q === "" ? "Salvo! Seu mural está público." : q !== had.trim() || answerFilled ? "Salvo! Quem já tinha desbloqueado precisará responder de novo." : "Salvo!" });
    setHad(q);
    setAnswer("");
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
        {/* uma coluna: tipo (fundo) do mural, nome, público/privado e, se privado, pergunta e resposta */}
        <fieldset className="mx-auto w-full max-w-[26rem] min-w-0">
          <legend className="mb-2 text-sm font-semibold">Tipo do mural</legend>
          <div className="relative">
            <div
              ref={strip}
              role="radiogroup"
              aria-label="Tipo do mural"
              onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth || 1)))}
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
                      {on ? (
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
        <div className="space-y-4">
        <Field label="Nome do mural">{(fid) => <input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />}</Field>
          <div role="radiogroup" aria-label="Quem pode abrir este mural" className="grid grid-cols-2 gap-2">
            {(
              [
                [false, "🌐 Público"],
                [true, "🔒 Privado"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={priv === val}
                onClick={() => setPriv(val)}
                className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${priv === val ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.2rem_0.7rem_rgba(217,162,27,.3)]" : "border-[#e1d3ba] bg-white hover:bg-[#fff6dd]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {priv && (
            <Field label="Pergunta de segurança">
              {(fid) => <input id={fid} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Ex: Qual o nome do nosso cachorro?" className={inputClass} />}
            </Field>
          )}
          {priv && (
            <Field label="Resposta">
              {(fid) => <input id={fid} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} autoComplete="off" placeholder={had.trim() ? "Digite aqui para trocar a resposta" : "Digite a resposta"} className={inputClass} />}
            </Field>
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

      {/* o primeiro mural nunca pode ser excluído: nesse caso a área nem aparece */}
      <div className={`mt-6 border-t border-[#e1d3ba] pt-4 ${canDelete ? "" : "hidden"}`}>
        {!canDelete ? null : confirmDelete ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm text-[#6b2a1c]">Excluir este mural apaga também a resposta, os acessos e todas as mensagens dele. Isso não pode ser desfeito.</p>
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
