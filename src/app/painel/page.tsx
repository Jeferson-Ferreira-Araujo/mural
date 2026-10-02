"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getOwnMural, useSession, type OwnMural } from "@/lib/auth";
import { getPublicMural, SITE_HOST, type MuralStats } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AnswersEditor, AuthShell, Field, ghostButton, inputClass, PrefixPicker, primaryButton, Spinner, type Prefix } from "@/components/ui";

export default function Painel() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [mural, setMural] = useState<OwnMural | null>(null);
  const [stats, setStats] = useState<MuralStats | null>(null);

  const [prefix, setPrefix] = useState<Prefix>("do");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [question, setQuestion] = useState("");
  const [changeAnswers, setChangeAnswers] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    const sb = getBrowserSupabase();
    getOwnMural(sb).then(async (m) => {
      if (!m) return router.replace("/criar");
      setMural(m);
      setName(m.owner_name);
      setPrefix(m.title_prefix);
      setTagline(m.tagline);
      setQuestion(m.question);
      setStats((await getPublicMural(sb, m.slug))?.stats ?? null);
    });
  }, [loading, session, router]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (changeAnswers && answers.length === 0) {
      setMsg({ ok: false, text: "Adicione ao menos uma resposta aceita." });
      return;
    }
    setBusy(true);
    const { error } = await getBrowserSupabase().rpc("update_mural", {
      p_owner_name: name.trim(),
      p_tagline: tagline.trim(),
      p_question: question.trim(),
      p_answers: changeAnswers ? answers : null,
      p_prefix: prefix,
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

  async function copy() {
    if (!mural) return;
    try {
      await navigator.clipboard.writeText(`https://${SITE_HOST}/${mural.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.replace("/");
  }

  if (loading || !mural) {
    return (
      <AuthShell wide>
        <Spinner />
      </AuthShell>
    );
  }

  const stat = (label: string, v?: number) => (
    <li className="rounded-xl border border-[#e1d3ba] bg-white/60 px-3 py-3 text-center">
      <span className="block text-2xl font-semibold">{v ?? "–"}</span>
      <span className="text-xs text-[#6b5440]">{label}</span>
    </li>
  );

  return (
    <AuthShell wide>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl font-semibold">Meu mural</h1>
          <p className="mt-1 break-all text-[#4a3826]">
            {SITE_HOST}/{mural.slug}
          </p>
        </div>
        <button type="button" onClick={signOut} className="shrink-0 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
          Sair
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link href={`/${mural.slug}`} className={`${primaryButton} sm:flex-1`}>
          Ver meu mural
        </Link>
        <button type="button" onClick={copy} className={`${ghostButton} sm:flex-1`}>
          {copied ? "Link copiado ✓" : "Copiar link"}
        </button>
      </div>

      <ul className="mt-6 grid grid-cols-4 gap-2" aria-label="Números do mural">
        {stat("visitaram", stats?.visited)}
        {stat("tentaram", stats?.tried)}
        {stat("acertaram", stats?.correct)}
        {stat("mensagens", stats?.messages)}
      </ul>

      <form onSubmit={save} className="mt-8 space-y-5" noValidate>
        <h2 className="font-title text-xl font-semibold">Editar mural</h2>
        <PrefixPicker value={prefix} onChange={setPrefix} />
        <Field label="Nome">{(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />}</Field>
        <Field label="Apresentação">{(id) => <input id={id} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} className={inputClass} />}</Field>
        <Field label="Pergunta de desbloqueio">{(id) => <input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} className={inputClass} />}</Field>

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
    </AuthShell>
  );
}
