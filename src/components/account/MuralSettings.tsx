"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchInventory, type BoardOffer } from "@/lib/badges";
import { BOARDS } from "@/lib/boards";
import { Field, ghostButton, inputClass, primaryButton, QuestionSuggestions } from "../ui";

/** Editar o mural: nome, pergunta (opcional: em branco = público), mensagem do mural vazio (PLUS) e excluir. */
export function MuralSettings({ mural, onSaved, onDeleted, canDelete = true }: { mural: OwnMural; onSaved: () => void; onDeleted: () => void ; /** o primeiro mural da conta nunca pode ser excluído */ canDelete?: boolean }) {
  const [title, setTitle] = useState(mural.title);
  const [question, setQuestion] = useState(mural.question);
  const [priv, setPriv] = useState(mural.question.trim() !== ""); // público ou privado (com pergunta de segurança)
  const [answer, setAnswer] = useState("");
  const strip = useRef<HTMLDivElement>(null);
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
        {/* nome e tipo na mesma linha; o tipo é um slide que desliza para o lado */}
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="min-w-0 space-y-3">
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
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-1 text-sm font-semibold">Tipo do mural</legend>
          <div className="relative">
          <div ref={strip} role="radiogroup" aria-label="Tipo do mural" className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {selectable.map((bd) => {
              const owned = true;
              const on = board === bd.id;
              return (
                <button
                  key={bd.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!owned}
                  onClick={() => setBoard(bd.id)}
                  className={`relative w-full shrink-0 snap-center rounded-xl border-2 p-1.5 text-center transition ${on ? "border-[#d9a21b] bg-[#fff6dd] shadow-[0_0.2rem_0.7rem_rgba(217,162,27,.35)] ring-2 ring-[#d9a21b]/40" : owned ? "cursor-pointer border-[#e1d3ba] bg-white hover:bg-[#fff6dd]" : "cursor-default border-[#e1d3ba] bg-white/50"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bd.image} alt="" draggable={false} className={`aspect-[3/2] w-full rounded-lg object-cover ${owned ? "" : "opacity-55"}`} />
                  {on && <span aria-hidden className="absolute top-2.5 left-2.5 grid size-5 place-items-center rounded-full bg-[#d9a21b] text-[#2a1c12] shadow"><svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>}
                  {!owned && <span aria-hidden className="absolute top-2.5 right-2.5 text-sm">🔒</span>}
                  <span className="mt-1 block text-xs font-semibold">{bd.name}</span>
                </button>
              );
            })}
          </div>
          {/* setas para o mouse: no computador não dá para deslizar com o dedo */}
          {selectable.length > 1 && ([-1, 1] as const).map((d) => (
            <button key={d} type="button" onClick={() => strip.current?.scrollBy({ left: d * (strip.current?.clientWidth ?? 230), behavior: "smooth" })} aria-label={d < 0 ? "Tipos anteriores" : "Próximos tipos"} className={`absolute top-1/3 z-10 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-[#17110c]/80 text-white shadow transition hover:bg-[#2b1c12] active:scale-90 ${d < 0 ? "left-2.5" : "right-2.5"}`}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={d < 0 ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
              </svg>
            </button>
          ))}
          </div>
        </fieldset>
        </div>
        {priv && (
          <Field label="Pergunta de segurança">
            {(fid) => (
              <>
                <input id={fid} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Ex: Qual o nome do nosso cachorro?" className={inputClass} />
                <QuestionSuggestions onPick={setQuestion} />
              </>
            )}
          </Field>
        )}
        {priv && question.trim() !== "" && (
          <Field label="Resposta" hint="Quem for responder precisa digitar exatamente assim, com os mesmos acentos e pontuação (maiúsculas e minúsculas não importam).">
            {(fid) => <input id={fid} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} autoComplete="off" placeholder={had.trim() ? "Digite aqui para trocar a resposta" : "Digite a resposta"} className={inputClass} />}
          </Field>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Salvando…" : "Salvar alterações"}
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
