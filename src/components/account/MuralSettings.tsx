"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { OwnMural } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { Field, ghostButton, inputClass, primaryButton, QuestionSuggestions } from "../ui";

/** Editar o mural: nome, pergunta (opcional: em branco = público), mensagem do mural vazio (FULL) e excluir. */
export function MuralSettings({ mural, onSaved, onDeleted }: { mural: OwnMural; onSaved: () => void; onDeleted: () => void }) {
  const [title, setTitle] = useState(mural.title);
  const [question, setQuestion] = useState(mural.question);
  const [welcome, setWelcome] = useState(mural.welcome_message ?? "");
  const [changeAnswer, setChangeAnswer] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [had, setHad] = useState(mural.question); // pergunta já salva (define se a resposta é nova)

  useEffect(() => {
    setTitle(mural.title);
    setQuestion(mural.question);
    setHad(mural.question);
    setWelcome(mural.welcome_message ?? "");
  }, [mural.id, mural.title, mural.question, mural.welcome_message]);

  // a resposta é pedida quando o mural passa a ter pergunta (era público) ou quando a pessoa escolhe trocá-la
  const askAnswer = changeAnswer || (question.trim() !== "" && !had);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const q = question.trim();
    if (!title.trim() || (q !== "" && q.length < 3)) {
      setMsg({ ok: false, text: q === "" ? "Preencha o nome do mural." : "A pergunta precisa ter pelo menos 3 letras." });
      return;
    }
    if (q !== "" && askAnswer && !answer.trim()) {
      setMsg({ ok: false, text: "Digite a resposta." });
      return;
    }
    setBusy(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.rpc("update_mural", { p_id: mural.id, p_title: title.trim(), p_question: q, p_answer: q !== "" && askAnswer ? answer.trim() : null });
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: "Não foi possível salvar. Confira os campos e tente de novo." });
      return;
    }
    if (mural.plan === "full" && welcome.trim() !== (mural.welcome_message ?? "")) {
      const { error: e2 } = await sb.rpc("set_welcome_message", { p_mural_id: mural.id, p_text: welcome.trim() });
      if (e2) {
        setBusy(false);
        setMsg({ ok: false, text: "Salvei o resto, mas não foi possível salvar a mensagem do mural vazio." });
        return;
      }
    }
    setBusy(false);
    setMsg({ ok: true, text: q === "" ? "Salvo! Seu mural está público." : askAnswer ? "Salvo! Quem já tinha desbloqueado precisará responder de novo." : "Salvo!" });
    setHad(q);
    setChangeAnswer(false);
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
        <Field label="Nome do mural">{(fid) => <input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />}</Field>
        <Field label="Pergunta de desbloqueio (opcional)" hint="Em branco, o mural fica público: qualquer pessoa com o link abre. Com pergunta e resposta, só entra quem souber.">
          {(fid) => (
            <>
              <input id={fid} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} className={inputClass} />
              <QuestionSuggestions onPick={setQuestion} />
            </>
          )}
        </Field>
        {question.trim() === "" ? null : askAnswer ? (
          <Field label={had ? "Nova resposta" : "Resposta"} hint="Quem for responder precisa digitar exatamente assim, com os mesmos acentos e pontuação (maiúsculas e minúsculas não importam).">
            {(fid) => <input id={fid} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} autoComplete="off" className={inputClass} />}
          </Field>
        ) : (
          <button type="button" onClick={() => setChangeAnswer(true)} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">
            Alterar a resposta
          </button>
        )}
        <Field
          label="Mensagem do mural vazio"
          hint={mural.plan === "full" ? `${welcome.length}/100 · Em branco aparece: "Nenhuma mensagem neste mural. Seja o primeiro a deixar!"` : '🔒 Personalizar essa mensagem é do PINZ FULL. Hoje aparece: "Você descobriu a resposta. Deixe uma mensagem para mim!"'}
        >
          {(fid) => (
            <input
              id={fid}
              value={mural.plan === "full" ? welcome : ""}
              onChange={(e) => setWelcome(e.target.value)}
              maxLength={100}
              disabled={mural.plan !== "full"}
              placeholder="Nenhuma mensagem neste mural. Seja o primeiro a deixar!"
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          )}
        </Field>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-6 border-t border-[#e1d3ba] pt-4">
        {confirmDelete ? (
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
          <button type="button" onClick={() => setConfirmDelete(true)} className="cursor-pointer text-sm font-semibold text-[#a23b2a] underline">
            Excluir este mural
          </button>
        )}
      </div>
    </div>
  );
}
