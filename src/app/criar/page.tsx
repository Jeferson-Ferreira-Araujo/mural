"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOwnMurals, getOwnNickname, useSession } from "@/lib/auth";
import { muralPath, muralUrl, uniqueSlug } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AddressBox, AnswersEditor, AuthShell, Field, ghostButton, inputClass, primaryButton, Spinner } from "@/components/ui";

const STEPS = ["Nome", "Apresentação", "Pergunta", "Publicar"] as const;
const DEFAULT_TAGLINE = "Mensagens de pessoas que me conhecem";

export default function CriarMural() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);
  const [savedNick, setSavedNick] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ nick: string; slug: string } | null>(null);
  const [taken, setTaken] = useState<string[]>([]);


  // exige login; quem já tem mural vai para o painel
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    const sb = getBrowserSupabase();
    Promise.all([getOwnMurals(sb), getOwnNickname(sb)]).then(([murals, n]) => {
      setTaken(murals.map((m) => m.slug));
      setSavedNick(n);
      setReady(true);
    });
  }, [loading, session, router]);

  const canNext = [
    title.trim().length >= 1,
    tagline.trim().length >= 1,
    question.trim().length >= 3 && answers.length >= 1,
    true,
  ][step];

  async function publish() {
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { data, error: err } = await sb.rpc("create_mural", {
      p_title: title.trim(),
      p_tagline: tagline.trim(),
      p_question: question.trim(),
      p_answers: answers,
    });
    setBusy(false);
    if (err) {
      if (err.message.includes("mural_limit")) return setError("Você chegou ao limite de 10 murais.");
      setError("Não foi possível publicar agora. Tente de novo.");
      return;
    }
    const r = data as { slug: string; nickname: string };
    setCreated({ nick: r.nickname, slug: r.slug });
  }

  if (loading || !ready) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  if (created) {
    const url = muralUrl(created);
    return (
      <AuthShell>
        <div role="status">
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <h1 className="font-title mt-2 text-2xl font-semibold">Seu mural está no ar!</h1>
          <p className="mt-3 text-[#4a3826]">Compartilhe este link com as pessoas que te conhecem:</p>
          <p className="mt-3 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3 font-semibold break-all">{url}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className={`${primaryButton} sm:flex-1`} onClick={() => navigator.clipboard?.writeText(`https://${url}`)}>
              Copiar link
            </button>
            <Link href={muralPath(created)} className={`${ghostButton} sm:flex-1`}>
              Ver meu mural
            </Link>
          </div>
          <Link href="/painel" className="mt-5 block text-center text-sm font-semibold text-[#6b5440] underline">
            Ir para o painel
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <ol className="mb-6 flex gap-1.5 sm:gap-2" aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0 flex-1" aria-current={i === step ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${i <= step ? "bg-[#1f232b]" : "bg-[#e1d3ba]"}`} />
            <span className={`mt-1.5 block truncate text-[11px] font-semibold sm:text-xs ${i === step ? "text-[#2f2218]" : "text-[#8a7b69]"}`}>{label}</span>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canNext) return;
          if (step < 3) setStep(step + 1);
          else void publish();
        }}
        className="space-y-5"
        noValidate
      >
        {step === 0 && (
          <>
            <h1 className="font-title text-2xl font-semibold">{taken.length > 0 ? "Vamos criar mais um mural" : "Como o seu mural vai se chamar?"}</h1>
            <Field label="Nome do mural" hint="Escreva o nome completo, do jeito que quiser.">
              {(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Mural do Jeferson" className={inputClass} autoFocus />}
            </Field>
            <AddressBox url={muralUrl({ nick: savedNick ?? "", slug: title.trim() ? uniqueSlug(title, taken) : "nome-do-mural" })} />
            {error && (
              <p role="alert" className="text-sm text-[#a23b2a]">
                {error}
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Uma frase de boas-vindas</h1>
            <Field label="Apresentação" hint="Aparece embaixo do nome do mural.">
              {(id) => <input id={id} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} className={inputClass} autoFocus />}
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Quem realmente te conhece?</h1>
            <p className="text-[#4a3826]">Crie uma pergunta que só quem é próximo de você saiba responder.</p>
            <Field label="Pergunta">
              {(id) => <input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Qual era meu apelido na escola?" className={inputClass} autoFocus />}
            </Field>
            <Field label="Respostas aceitas" hint="Até 5. Maiúsculas, acentos e pontuação são ignorados (“Jéf” = “jef”). As respostas ficam guardadas de forma protegida.">
              {() => <AnswersEditor answers={answers} onChange={setAnswers} />}
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Tudo certo?</h1>
            <dl className="space-y-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-5 text-[15px]">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Mural</dt>
                <dd className="font-title text-xl font-semibold">{title.trim()}</dd>
                <dd className="text-[#4a3826] italic">{tagline.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Pergunta</dt>
                <dd>{question.trim()}</dd>
                <dd className="text-[#6b5440]">Respostas aceitas: {answers.join(", ")}</dd>
              </div>
            </dl>
            <AddressBox url={muralUrl({ nick: savedNick ?? "", slug: uniqueSlug(title, taken) })} />
            {error && (
              <p role="alert" className="text-sm text-[#a23b2a]">
                {error}
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className={ghostButton}>
              Voltar
            </button>
          )}
          <button type="submit" disabled={!canNext || busy} className={`${primaryButton} flex-1`}>
            {step < 3 ? "Continuar" : busy ? "Publicando…" : "Publicar meu mural"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
