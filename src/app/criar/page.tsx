"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PLUS_MAX_MURALS } from "@/lib/plans";
import { fetchInventory } from "@/lib/badges";
import { getOwnMurals, getOwnProfile, homeRouteFor, useSession } from "@/lib/auth";
import { NicknameSetup } from "@/components/account/NicknameSetup";
import { muralUrl, uniqueSlug } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AddressBox, AuthShell, Field, ghostButton, inputClass, primaryButton, QuestionSuggestions, Spinner } from "@/components/ui";
import { useTranslations } from "next-intl";

const STEPS = ["Nome", "Pergunta", "Mural"] as const;

export default function CriarMural() {
  const tx = useTranslations("app.criar.page");
  const router = useRouter();
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);
  const [savedNick, setSavedNick] = useState<string | null>(null);
  const [nickPending, setNickPending] = useState(false); // entrou por login social e ainda não escolheu o nome de usuário

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [slots, setSlots] = useState(1); // murais permitidos: 1 + os comprados na loja
  const [plus, setPlus] = useState(false);


  // exige login
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    const sb = getBrowserSupabase();
    Promise.all([getOwnMurals(sb), getOwnProfile(sb), fetchInventory(sb)]).then(([murals, prof, inv]) => {
      setTaken(murals.map((m) => m.slug));
      setSavedNick(prof?.nickname ?? null);
      setNickPending(prof ? !prof.confirmed : false);
      setPlus(inv?.plus === true);
      setSlots(Math.max(inv?.plus === true ? PLUS_MAX_MURALS : 1, 1 + (inv?.extraMurals ?? 0))); // PINZ+: até 10 murais
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
      setError(err.message.includes("mural_limit") ? plus ? tx("m_voceChegouAoLimiteDe", { v0: PLUS_MAX_MURALS }) : tx("m_oPlanoGratuitoInclui1") : tx("m_naoFoiPossivelCriarO"));
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

  const nickSetup = <NicknameSetup open={nickPending && !!savedNick} suggested={savedNick ?? ""} onDone={(n) => { setSavedNick(n); setNickPending(false); }} />;

  // 1 mural por conta; mais murais, só no PINZ+ (comprando na loja com créditos)
  if (taken.length >= slots) {
    return (
      <AuthShell>
        <div className="rounded-3xl border border-[#e6d8bd] bg-[#fbf6ea] p-6 text-center text-[#2f2218] shadow-[0_1rem_3rem_rgba(0,0,0,.35)]">
          <h1 className="font-title text-2xl font-semibold">{plus ? tx("m_todosOsSeusMuraisEstao") : tx("m_seuMuralJaEstaNo")}</h1>
          <p className="mt-2 text-sm text-[#6b5440]">
            {plus ? tx("m_oLimiteDoPinzE", { v0: PLUS_MAX_MURALS }) : tx("m_oPlanoGratuitoInclui12")}
          </p>
          <Link href={savedNick && taken[0] ? `/${savedNick}/${taken[0]}` : "/"} className={`${primaryButton} mt-5`}>
            {tx("irParaOMeuMural")}</Link>
        </div>
        {nickSetup}
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      {nickSetup}
      <ol className="mb-6 flex gap-1.5 sm:gap-2" aria-label={tx("etapas")}>
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
            <h1 className="font-title text-2xl font-semibold">{taken.length > 0 ? tx("m_vamosCriarMaisUmMural") : tx("m_comoOSeuMuralVai")}</h1>
            <Field label={tx("nomeDoMural")} hint={tx("escrevaONomeCompletoDo")}>
              {(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={tx("exMuralJeferson")} className={inputClass} autoFocus />}
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
            <h1 className="font-title text-2xl font-semibold">{tx("querDeixarOMuralPrivado")}</h1>
            <p className="text-[#4a3826]">{tx("opcionalCrieUmaPerguntaQue")}</p>
            <Field label={tx("perguntaOpcional")}>
              {(id) => (
                <>
                  <input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder={tx("exQualEraMeuApelido")} className={inputClass} autoFocus />
                  <QuestionSuggestions onPick={setQuestion} />
                </>
              )}
            </Field>
            {question.trim() !== "" && (
              <Field label={tx("resposta")} hint={tx("quemForResponderPrecisaDigitar")}>
                {(id) => <input id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} placeholder={tx("exJef")} autoComplete="off" className={inputClass} />}
              </Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-title text-2xl font-semibold">{tx("tudoCerto")}</h1>
            <dl className="space-y-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-5 text-[15px]">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{tx("mural")}</dt>
                <dd className="font-title text-xl font-semibold">{title.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">{tx("acesso")}</dt>
                {question.trim() ? (
                  <>
                    <dd>{question.trim()}</dd>
                    <dd className="text-[#6b5440]">Resposta: {answer.trim()}</dd>
                  </>
                ) : (
                  <dd>{tx("publicoQualquerPessoaComO")}</dd>
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
              {tx("voltar")}</button>
          )}
          <button type="submit" disabled={!canNext || busy} className={`${primaryButton} flex-1`}>
            {step < 2 ? "Continuar" : busy ? "Criando…" : tx("m_criarMeuMural")}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
