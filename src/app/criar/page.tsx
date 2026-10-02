"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOwnMural, useSession } from "@/lib/auth";
import { SITE_HOST, SLUG_RE, slugAvailable, slugify } from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import { AnswersEditor, AuthShell, Field, ghostButton, inputClass, PrefixPicker, primaryButton, Spinner, type Prefix } from "@/components/ui";

const STEPS = ["Nome", "Apresentação", "Pergunta", "Publicar"] as const;
const DEFAULT_TAGLINE = "Mensagens de pessoas que me conhecem";

type SlugState = "idle" | "checking" | "ok" | "taken" | "invalid";

export default function CriarMural() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);

  const [step, setStep] = useState(0);
  const [prefix, setPrefix] = useState<Prefix>("do");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  // exige login; quem já tem mural vai para o painel
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/entrar");
      return;
    }
    getOwnMural(getBrowserSupabase()).then((m) => {
      if (m) router.replace("/painel");
      else setReady(true);
    });
  }, [loading, session, router]);

  // o endereço acompanha o nome até a pessoa editá-lo
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  // verifica disponibilidade (com pequena espera enquanto digita)
  useEffect(() => {
    if (!slug) return setSlugState("idle");
    if (!SLUG_RE.test(slug)) return setSlugState("invalid");
    setSlugState("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      const ok = await slugAvailable(getBrowserSupabase(), slug);
      if (!cancelled) setSlugState(ok ? "ok" : "taken");
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug]);

  const slugMessage: Record<SlugState, string | null> = {
    idle: null,
    checking: "Verificando…",
    ok: "Disponível ✓",
    taken: "Esse endereço já está em uso.",
    invalid: "Use de 3 a 30 letras minúsculas, números ou hífen.",
  };

  const canNext = [
    name.trim().length >= 1 && slugState === "ok",
    tagline.trim().length >= 1,
    question.trim().length >= 3 && answers.length >= 1,
    true,
  ][step];

  async function publish() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await getBrowserSupabase().rpc("create_mural", {
      p_slug: slug,
      p_owner_name: name.trim(),
      p_tagline: tagline.trim(),
      p_question: question.trim(),
      p_answers: answers,
      p_prefix: prefix,
    });
    setBusy(false);
    if (err) {
      if (err.message.includes("already_has_mural")) return router.replace("/painel");
      if (err.message.includes("slug_unavailable")) {
        setStep(0);
        setSlugState("taken");
        return;
      }
      setError("Não foi possível publicar agora. Tente de novo.");
      return;
    }
    setCreated((data as { slug: string }).slug);
  }

  if (loading || !ready) {
    return (
      <AuthShell>
        <Spinner />
      </AuthShell>
    );
  }

  if (created) {
    const url = `${SITE_HOST}/${created}`;
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
            <button
              type="button"
              className={`${primaryButton} sm:flex-1`}
              onClick={() => navigator.clipboard?.writeText(`https://${url}`)}
            >
              Copiar link
            </button>
            <Link href={`/${created}`} className={`${ghostButton} sm:flex-1`}>
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
          <li key={label} className="flex-1" aria-current={i === step ? "step" : undefined}>
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
            <h1 className="font-title text-2xl font-semibold">Como o seu mural vai se chamar?</h1>
            <PrefixPicker value={prefix} onChange={setPrefix} />
            <Field label="Nome" hint={`Vai aparecer como “Mural ${prefix} ${name.trim() || "…"}”.`}>
              {(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Jeferson" className={inputClass} autoFocus />}
            </Field>
            <Field label="Endereço do mural" error={slugState === "taken" || slugState === "invalid" ? slugMessage[slugState] : null} hint={slugMessage[slugState] ?? `${SITE_HOST}/${slug || "seu-nome"}`}>
              {(id) => (
                <div className="flex items-center rounded-xl border border-[#e1d3ba] bg-white/80 focus-within:border-[#b8873b] focus-within:ring-2 focus-within:ring-[#d98a2b]/50">
                  <span className="hidden pl-4 text-sm whitespace-nowrap text-[#8a7b69] sm:inline">{SITE_HOST}/</span>
                  <input
                    id={id}
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    maxLength={30}
                    placeholder="seu-nome"
                    aria-label="Endereço do mural"
                    className="min-w-0 flex-1 bg-transparent py-3 pr-4 pl-4 text-base outline-none sm:pl-1"
                  />
                </div>
              )}
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-title text-2xl font-semibold">Uma frase de boas-vindas</h1>
            <Field label="Apresentação" hint="Aparece embaixo do seu nome no mural.">
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
                <dd className="font-title text-xl font-semibold">Mural {prefix} {name.trim()}</dd>
                <dd className="text-[#4a3826] italic">{tagline.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Endereço</dt>
                <dd className="break-all">
                  {SITE_HOST}/{slug}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Pergunta</dt>
                <dd>{question.trim()}</dd>
                <dd className="text-[#6b5440]">Respostas aceitas: {answers.join(", ")}</dd>
              </div>
            </dl>
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
