"use client";

import { useState, type FormEvent } from "react";
import { passwordProblem } from "@/lib/password";
import { getBrowserSupabase } from "@/lib/supabase";
import { getProfilePrivacy, getVisitPrivacy, saveProfilePrivacy, setVisitPrivacy } from "@/lib/social";
import { useEffect } from "react";
import { AvatarUploader } from "../AvatarUploader";
import { PasswordHints } from "../PasswordHints";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

/** Perfil: foto, nome de usuário e e-mail (só leitura) e troca de senha. */
export function ProfileModal({ open, onClose, nick, email, onSignOut, onPrivacySaved, plus = false }: { open: boolean; onClose: () => void; nick: string; email: string; onSignOut: () => void; /** a privacidade mudou: recarrega os murais da tela */ onPrivacySaved?: () => void; plus?: boolean }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // privacidade do perfil: público ou privado (pergunta e resposta de segurança, valendo para todos os murais)
  const [priv, setPriv] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [hadAnswer, setHadAnswer] = useState(false);
  const [privBusy, setPrivBusy] = useState(false);
  const [privErr, setPrivErr] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPrivErr(null);
    setFlash(false);
    void getProfilePrivacy(getBrowserSupabase()).then((p) => {
      if (!p) return;
      setPriv(p.private);
      setQuestion(p.question);
      setAnswer(p.answer);
      setHadAnswer(p.private);
    });
  }, [open]);
  async function savePrivacy() {
    setPrivErr(null);
    const q = question.trim();
    if (priv && q.length < 3) return setPrivErr(q === "" ? "Escreva a pergunta de segurança." : "A pergunta precisa ter pelo menos 3 letras.");
    if (priv && !answer.trim() && !hadAnswer) return setPrivErr("Digite a resposta.");
    setPrivBusy(true);
    const ok = await saveProfilePrivacy(getBrowserSupabase(), priv, priv ? q : "", priv && answer.trim() ? answer.trim() : null);
    setPrivBusy(false);
    if (!ok) return setPrivErr("Não foi possível salvar. Confira os campos e tente de novo.");
    setHadAnswer(priv);
    onPrivacySaved?.();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1600);
  }
  const [showVisits, setShowVisits] = useState(true); // aparecer como visitante
  useEffect(() => {
    if (open) void getVisitPrivacy(getBrowserSupabase()).then(setShowVisits);
  }, [open]);
  async function toggleVisits() {
    const next = !showVisits;
    setShowVisits(next);
    if (!(await setVisitPrivacy(getBrowserSupabase(), next))) setShowVisits(!next);
  }
  const [delOpen, setDelOpen] = useState(false); // confirmação de excluir a conta
  const [delText, setDelText] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  async function deleteAccount() {
    if (delText.trim().toUpperCase() !== "EXCLUIR" || delBusy) return;
    setDelBusy(true);
    setDelErr(null);
    const sb = getBrowserSupabase();
    const { data } = await sb.auth.getSession();
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "EXCLUIR" }),
    }).catch(() => null);
    if (res?.ok) {
      await sb.auth.signOut();
      window.location.assign("/");
      return;
    }
    setDelBusy(false);
    const err = (await res?.json().catch(() => null)) as { error?: string } | null;
    setDelErr(err?.error === "admin" ? "Contas de administrador não podem ser excluídas por aqui." : err?.error === "rate_limited" ? "Muitas tentativas. Tente de novo mais tarde." : "Não foi possível excluir agora. Tente de novo ou fale com o suporte.");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const problem = passwordProblem(pw, { email, username: nick });
    if (problem) return setMsg({ ok: false, text: problem });
    if (pw !== pw2) return setMsg({ ok: false, text: "As senhas não são iguais." });
    setBusy(true);
    const { error } = await getBrowserSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: /same|different/i.test(error.message) ? "A nova senha precisa ser diferente da atual." : /weak|password/i.test(error.message) ? "Senha muito fraca. Use letras, números e símbolos." : "Não foi possível trocar a senha agora. Tente de novo." });
      return;
    }
    setPw("");
    setPw2("");
    setMsg({ ok: true, text: "Senha alterada!" });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Perfil"
      overlay={
        flash ? (
          <div role="status" className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[#fbf6ea]/95 backdrop-blur-sm">
            <div className="text-center" style={{ animation: "buy-pop 0.5s ease" }}>
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#3aa655] text-white shadow-[0_0.5rem_1.6rem_rgba(58,166,85,.5)]">
                <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <p className="font-title mt-4 text-2xl font-semibold text-[#1f4d2b]">Privacidade salva!</p>
            </div>
          </div>
        ) : undefined
      }
    >
      <AvatarUploader nickname={nick} plus={plus} />
      <dl className="mt-4 space-y-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-4 text-sm">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">Nome de usuário</dt>
          <dd className="font-semibold break-all">{nick}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-[#8a7b69] uppercase">E-mail</dt>
          <dd className="break-all">{email || "—"}</dd>
        </div>
      </dl>

      <section aria-label="Privacidade dos seus murais" className="mt-5 space-y-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-4">
        <h3 className="font-title text-base font-semibold">Privacidade dos murais</h3>
        <div role="radiogroup" aria-label="Quem pode abrir os seus murais" className="grid grid-cols-2 gap-2">
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
          <>
            <Field label="Pergunta de segurança">{(id) => <input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Ex: Qual o nome do nosso cachorro?" className={inputClass} />}</Field>
            <Field label="Resposta">{(id) => <input id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} autoComplete="off" placeholder="Digite a resposta" className={inputClass} />}</Field>
          </>
        )}
        {privErr && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {privErr}
          </p>
        )}
        <button type="button" onClick={() => void savePrivacy()} disabled={privBusy} className={primaryButton}>
          {privBusy ? "Salvando…" : "Salvar privacidade"}
        </button>
      </section>

      <form onSubmit={save} noValidate className="mt-5 space-y-3">
        <h3 className="font-title text-base font-semibold">Mudar senha</h3>
        <Field label="Nova senha">
          {(id) => (
            <div className="relative">
              <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setMsg(null); }} className={`${inputClass} pr-20`} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="absolute inset-y-0 right-3 cursor-pointer text-sm font-semibold text-[#6b5440] hover:text-[#2f2218]">
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          )}
        </Field>
        <PasswordHints password={pw} email={email} username={nick} />
        <Field label="Repita a nova senha">{(id) => <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setMsg(null); }} className={inputClass} />}</Field>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Aparecer como visitante</p>
          <p className="text-xs text-[#6b5440]">Desligado, você some das listas de visitantes e também não vê quem visitou os seus murais.</p>
        </div>
        <button type="button" role="switch" aria-checked={showVisits} aria-label="Aparecer como visitante" onClick={() => void toggleVisits()} className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${showVisits ? "bg-[#2f8f4e]" : "bg-[#b9ad9b]"}`}>
          <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${showVisits ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <button type="button" onClick={onSignOut} className="mt-5 w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
        Sair da conta
      </button>

      <div className="mt-6 border-t border-[#e1d3ba] pt-4">
        {!delOpen ? (
          <button type="button" onClick={() => setDelOpen(true)} className="cursor-pointer text-sm font-semibold text-[#a23b2a] underline">
            Excluir minha conta
          </button>
        ) : (
          <div role="alertdialog" aria-label="Excluir minha conta" className="rounded-xl border border-[#e3b3a8] bg-[#fbeae5] p-4">
            <p className="text-sm font-bold text-[#6b2a1c]">Excluir a conta</p>
            <p className="mt-1 text-sm text-[#6b2a1c]">Sua conta fica desativada por 30 dias e ninguém mais a vê, e a assinatura PLUS é cancelada. Se você entrar de novo nesse período, ela volta como estava. Depois disso, tudo é apagado de vez: murais, pins, fotos, bottons, créditos e os recados que você deixou em murais de outras pessoas.</p>
            <label htmlFor="del-confirm" className="mt-3 block text-sm font-semibold text-[#6b2a1c]">
              Para confirmar, digite EXCLUIR
            </label>
            <input id="del-confirm" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" className={`${inputClass} mt-1`} />
            {delErr && (
              <p role="alert" className="mt-2 text-sm text-[#a23b2a]">
                {delErr}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDelOpen(false);
                  setDelText("");
                  setDelErr(null);
                }}
                disabled={delBusy}
                className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={delBusy || delText.trim().toUpperCase() !== "EXCLUIR"}
                className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {delBusy ? "Excluindo…" : "Excluir conta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
