"use client";

import { useState, type FormEvent } from "react";
import { passwordProblem } from "@/lib/password";
import { getBrowserSupabase } from "@/lib/supabase";
import { AvatarUploader } from "../AvatarUploader";
import { PasswordHints } from "../PasswordHints";
import { Field, inputClass, primaryButton } from "../ui";
import { Modal } from "./Modal";

/** Perfil: foto, nome de usuário e e-mail (só leitura) e troca de senha. */
export function ProfileModal({ open, onClose, nick, email, onSignOut }: { open: boolean; onClose: () => void; nick: string; email: string; onSignOut: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
    <Modal open={open} onClose={onClose} title="Perfil">
      <AvatarUploader nickname={nick} />
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

      <button type="button" onClick={onSignOut} className="mt-5 w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#6b2a1c] transition hover:bg-white">
        Sair da conta
      </button>
    </Modal>
  );
}
