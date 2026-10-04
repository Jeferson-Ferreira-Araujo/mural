"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccount } from "@/lib/account";
import { PLANS, NEW_MURAL_COST } from "@/lib/plans";
import { getOwnMurals, getOwnNickname, homeRouteFor, useSession } from "@/lib/auth";
import { muralUrl, uniqueSlug } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AddressBox, AuthShell, Field, ghostButton, inputClass, primaryButton, QuestionSuggestions, Spinner } from "@/components/ui";

const STEPS = ["Nome", "Pergunta", "Mural"] as const;

export default function CriarMural() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);
  const [savedNick, setSavedNick] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);


  // exige login
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
    question.trim() === "" || (question.trim().length >= 3 && answer.trim().length >= 1), // pergunta é opcional: em branco = mural público
    true,
  ][step];

  async function publish() {
    setBusy(true);
    setError(null);
    const sb = getBrowserSupabase();
    const { error: err } = await sb.rpc("create_mural", {
      p_title: title.trim(),
      p_question: question.trim(),
      p_answer: answer.trim(),
    });
    if (err) {
      setBusy(false);
      setError(err.message.includes("mural_limit") ? "Seu plano gratuito inclui 1 mural." : "Não foi possível criar o mural agora. Tente de novo.");
      return;
    }
    router.replace(await homeRouteFor(sb)); // vai para o mural novo; segue "Criando…" até a navegação terminar
  }

  if (loading || !ready) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  // plano gratuito: 1 mural por usuário (novos murais virão com créditos)
  if (taken.length >= PLANS[getAccount().plan].murals) {
    return (
      <AuthShell>
        <div className="rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-6 text-center text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.35)]">
          <h1 className="font-title text-2xl font-semibold">Seu mural já está no ar</h1>
          <p className="mt-2 text-sm text-[#6b5440]">O plano gratuito inclui {PLANS.free.murals} mural por pessoa. Um novo mural custará {NEW_MURAL_COST} créditos (em breve).</p>
          <Link href={savedNick && taken[0] ? `/${savedNick}/${taken[0]}` : "/"} className={`${primaryButton} mt-5`}>
            Ir para o meu mural
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
          if (step < 2) setStep(step + 1);
          else void publish();
        }}
        className="space-y-5"
        noValidate
      >
        {step === 0 && (
          <>
            <h1 className="font-title text-2xl font-semibold">{taken.length > 0 ? "Vamos criar mais um mural" : "Como o seu mural vai se chamar?"}</h1>
            <Field label="Nome do mural" hint="Escreva o nome completo, do jeito que quiser.">
              {(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex: Mural do Jeferson" className={inputClass} autoFocus />}
            </Field>
            {error && (
              <p role="alert" className="text-sm text-[#a23b2a]">
                {error}
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Quer deixar o mural privado?</h1>
            <p className="text-[#4a3826]">Opcional. Crie uma pergunta que só quem é próximo de você saiba responder. Se deixar em branco, qualquer pessoa com o link abre o mural.</p>
            <Field label="Pergunta (opcional)">
              {(id) => (
                <>
                  <input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Ex: Qual era meu apelido na escola?" className={inputClass} autoFocus />
                  <QuestionSuggestions onPick={setQuestion} />
                </>
              )}
            </Field>
            {question.trim() !== "" && (
              <Field label="Resposta" hint="Quem for responder precisa digitar exatamente assim, com os mesmos acentos e pontuação (só maiúsculas e minúsculas não importam).">
                {(id) => <input id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} placeholder="Ex: Jéf" autoComplete="off" className={inputClass} />}
              </Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Tudo certo?</h1>
            <dl className="space-y-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-5 text-[15px]">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Mural</dt>
                <dd className="font-title text-xl font-semibold">{title.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Acesso</dt>
                {question.trim() ? (
                  <>
                    <dd>{question.trim()}</dd>
                    <dd className="text-[#6b5440]">Resposta: {answer.trim()}</dd>
                  </>
                ) : (
                  <dd>Público: qualquer pessoa com o link abre</dd>
                )}
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
            {step < 2 ? "Continuar" : busy ? "Criando…" : "Criar meu mural"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
