"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getOwnMurals, getOwnNickname, useSession, type OwnMural } from "@/lib/auth";
import { muralPath, muralUrl } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AnswersEditor, AuthShell, Field, ghostButton, inputClass, primaryButton, Spinner } from "@/components/ui";

export default function EditarMural() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { session, loading } = useSession();
  const [mural, setMural] = useState<OwnMural | null>(null);
  const [nick, setNick] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [changeAnswers, setChangeAnswers] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    const sb = getBrowserSupabase();
    Promise.all([getOwnMurals(sb), getOwnNickname(sb)]).then(([murals, n]) => {
      const m = murals.find((x) => x.id === id);
      if (!m) return router.replace("/painel");
      setMural(m);
      setNick(n);
      setTitle(m.title);
      setQuestion(m.question);
    });
  }, [loading, session, id, router]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim() || question.trim().length < 3) {
      setMsg({ ok: false, text: "Preencha o nome e a pergunta." });
      return;
    }
    if (changeAnswers && answers.length === 0) {
      setMsg({ ok: false, text: "Adicione ao menos uma resposta aceita." });
      return;
    }
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("update_mural", {
      p_id: id,
      p_title: title.trim(),
      p_question: question.trim(),
      p_answers: changeAnswers ? answers : null,
    });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: "Não foi possível salvar. Confira os campos e tente de novo." });
      return;
    }
    setMsg({ ok: true, text: changeAnswers ? "Salvo! Quem já tinha desbloqueado precisará responder de novo." : "Salvo!" });
    setChangeAnswers(false);
    setAnswers([]);
  }

  async function remove() {
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("delete_mural", { p_id: id });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: "Não foi possível excluir. Tente de novo." });
      return;
    }
    router.replace("/painel");
  }

  if (loading || !mural || !nick) {
    return (
      <AuthShell wide>
        <Spinner />
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <Link href="/painel" className="text-sm font-semibold text-[#6b5440] underline">
        ← Meus murais
      </Link>
      <h1 className="font-title mt-3 text-2xl font-semibold">Editar mural</h1>
      <p className="mt-1 text-sm break-all text-[#6b5440]">{muralUrl({ nick, slug: mural.slug })}</p>
      <Link href={muralPath({ nick, slug: mural.slug })} className={`${ghostButton} mt-4 w-full sm:w-auto`}>
        Ver mural
      </Link>

      <form onSubmit={save} className="mt-6 space-y-5" noValidate>
        <Field label="Nome do mural">{(fid) => <input id={fid} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />}</Field>
        <Field label="Pergunta de desbloqueio">{(fid) => <input id={fid} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} className={inputClass} />}</Field>

        {changeAnswers ? (
          <Field label="Novas respostas aceitas" hint="Substituem as atuais. Quem já tinha desbloqueado precisará responder de novo.">
            {() => <AnswersEditor answers={answers} onChange={setAnswers} />}
          </Field>
        ) : (
          <button type="button" onClick={() => setChangeAnswers(true)} className="cursor-pointer text-sm font-semibold text-[#6b5440] underline">
            Alterar respostas aceitas
          </button>
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

      <div className="mt-8 border-t border-[#e1d3ba] pt-5">
        {confirmDelete ? (
          <div role="alert" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm text-[#6b2a1c]">Excluir este mural apaga também as respostas, os acessos e todas as mensagens dele. Isso não pode ser desfeito.</p>
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
    </AuthShell>
  );
}
