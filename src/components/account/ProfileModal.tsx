"use client";

import { forgetGeoChoice } from "@/lib/geo";
import { useRef, useState, type FormEvent } from "react";
import { callbackUrl, rememberNext } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { getProfilePrivacy, getVisitPrivacy, saveProfilePrivacy, setVisitPrivacy } from "@/lib/social";
import { useEffect } from "react";
import { AvatarUploader } from "../AvatarUploader";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

/** Interruptor "Aparecer como visitante" no Perfil: desligado por enquanto (quem já tinha escolhido mantém a escolha; para religar, troque para true). */
const VISIT_TOGGLE_ENABLED = false;

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
  const delRef = useRef<HTMLDialogElement>(null);
  const [delOpen, setDelOpen] = useState(false); // confirmação de excluir a conta
  const [delText, setDelText] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) return;
    setDelOpen(false); // fechou o Perfil: a confirmação de excluir não fica pendurada para a próxima abertura
    setDelText("");
    setDelErr(null);
  }, [open]);

  useEffect(() => {
    const d = delRef.current;
    if (!d) return;
    if (delOpen && !d.open) d.showModal();
    if (!delOpen && d.open) d.close();
  }, [delOpen]);

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
      forgetGeoChoice(); // conta excluída: a escolha de localização deste aparelho também
      await sb.auth.signOut();
      window.location.assign("/");
      return;
    }
    setDelBusy(false);
    const err = (await res?.json().catch(() => null)) as { error?: string } | null;
    setDelErr(err?.error === "admin" ? "Contas de administrador não podem ser excluídas por aqui." : err?.error === "rate_limited" ? "Muitas tentativas. Tente de novo mais tarde." : "Não foi possível excluir agora. Tente de novo ou fale com o suporte.");
  }

  // entrou só pelo Google? Não tem senha do Pinz para trocar
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  useEffect(() => {
    if (!open) return;
    void getBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => setHasPassword(data.user ? (data.user.identities ?? []).some((i) => i.provider === "email") : null));
  }, [open]);
  async function sendResetLink() {
    setMsg(null);
    setBusy(true);
    rememberNext("/auth/nova-senha"); // o e-mail volta pelo mesmo caminho do login e cai direto na tela da nova senha
    const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
    setBusy(false);
    if (error) {
      rememberNext(null);
      return setMsg({ ok: false, text: "Não foi possível enviar o link agora. Tente de novo daqui a pouco." });
    }
    setMsg({ ok: true, text: `Enviamos um link para ${email}. Ele vale por pouco tempo: abra no mesmo navegador.` });
  }

  return (
    <>
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


      <section aria-label="Senha" className="mt-5 space-y-3">
        <h3 className="font-title text-base font-semibold">Senha</h3>
        {hasPassword === false ? (
          <p className="text-sm text-[#4a3826]">Você entra com o Google, então não há senha do Pinz para trocar.</p>
        ) : (
          <>
            <p className="text-sm text-[#4a3826]">Para sua segurança, a troca é feita por um link enviado para <strong className="break-all">{email}</strong>.</p>
            {msg && (
              <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}`}>
                {msg.text}
              </p>
            )}
            <button type="button" onClick={() => void sendResetLink()} disabled={busy || !email} className={primaryButton}>
              {busy ? "Enviando…" : "Enviar link para trocar a senha"}
            </button>
          </>
        )}
      </section>

      {VISIT_TOGGLE_ENABLED && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Aparecer como visitante</p>
            <p className="text-xs text-[#6b5440]">Desligado, você some das listas de visitantes e também não vê quem visitou os seus murais.</p>
          </div>
          <button type="button" role="switch" aria-checked={showVisits} aria-label="Aparecer como visitante" onClick={() => void toggleVisits()} className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${showVisits ? "bg-[#2f8f4e]" : "bg-[#b9ad9b]"}`}>
            <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${showVisits ? "translate-x-5" : ""}`} />
          </button>
        </div>
      )}

      <button type="button" onClick={onSignOut} className="mt-5 w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
        Sair da conta
      </button>

      <button type="button" onClick={() => setDelOpen(true)} className="mt-3 w-full cursor-pointer rounded-xl border border-[#e3b3a8] bg-[#fbeae5] px-4 py-3 text-sm font-semibold text-[#a23b2a] transition hover:bg-[#f7ddd5]">
        Excluir a conta
      </button>
    </Modal>


      {/* confirmação de excluir a conta: janela nativa centralizada em TODA a tela (acima do menu lateral), só exclui depois de digitar EXCLUIR */}
      <dialog
        ref={delRef}
        aria-label="Excluir a conta"
        onClose={() => {
          if (delOpen) {
            setDelOpen(false);
            setDelText("");
            setDelErr(null);
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !delBusy) delRef.current?.close();
        }}
        className="m-auto w-[min(92vw,24rem)] max-w-none overflow-visible rounded-3xl border-0 bg-transparent p-0 backdrop:bg-[#2a1c12]/65 backdrop:backdrop-blur-sm"
      >
              <div className="w-full rounded-3xl border border-[#e3b3a8] bg-[#fdf6f3] p-5 text-[#4a1d14] shadow-[0_1rem_3rem_rgba(0,0,0,.45)]">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fbd9d2] text-[#a23b2a]" aria-hidden>
                  <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
                    <path d="M12 10v4.5M12 17.5v.01" />
                  </svg>
                </span>
                <h2 className="font-title mt-3 text-center text-2xl font-semibold">Excluir a conta?</h2>
                <p className="mt-2 text-center text-sm">Sua conta ficará inativa por <strong>30 dias</strong> e, depois disso, será <strong>totalmente apagada</strong>, com murais, pins e bottons. Depois do prazo, não dá para desfazer.</p>
                <label htmlFor="del-confirm" className="mt-4 block text-sm font-semibold">
                  Para confirmar, digite <span className="rounded bg-[#fbd9d2] px-1.5 py-0.5 font-bold">EXCLUIR</span>
                </label>
                <input id="del-confirm" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" autoCapitalize="characters" className={`${inputClass} mt-1.5`} />
                {delErr && (
                  <p role="alert" className="mt-2 text-sm text-[#a23b2a]">
                    {delErr}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => {
                if (delBusy) return;
                setDelOpen(false);
                setDelText("");
                setDelErr(null);
              }} disabled={delBusy} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => void deleteAccount()} disabled={delBusy || delText.trim().toUpperCase() !== "EXCLUIR"} className="flex-1 cursor-pointer rounded-xl bg-[#a23b2a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c3022] disabled:cursor-not-allowed disabled:opacity-50">
                    {delBusy ? "Excluindo…" : "Excluir conta"}
                  </button>
                </div>
              </div>
      </dialog>
    </>
  );
}
