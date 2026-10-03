"use client";

import { useEffect, useRef, useState } from "react";
import { getOwnAvatar, MAX_AVATAR_MB, processAvatar, removeAvatar, uploadAvatar } from "@/lib/avatar";
import { getBrowserSupabase } from "@/lib/supabase";
import { Avatar } from "./Avatar";

/**
 * Foto de perfil do dono (aparece no mural, na busca e no painel). Quem acabou de criar o mural é convidado a enviar a primeira.
 * A foto é recortada em quadrado e reduzida no próprio navegador antes de ir para o servidor.
 */
export function AvatarUploader({ nickname }: { nickname: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getOwnAvatar(getBrowserSupabase()).then((a) => {
      setUrl(a.url);
      setReady(true);
    });
  }, []);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const blob = await processAvatar(file);
      setUrl(await uploadAvatar(getBrowserSupabase(), blob));
      setMsg({ ok: true, text: "Foto salva! Ela já aparece no seu mural." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível enviar a foto." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      await removeAvatar(getBrowserSupabase());
      setUrl(null);
      setMsg({ ok: true, text: "Foto removida." });
    } catch {
      setMsg({ ok: false, text: "Não foi possível remover agora." });
    } finally {
      setBusy(false);
    }
  }

  const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition-colors hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

  return (
    <section aria-label="Sua foto" className={`mt-5 flex items-center gap-4 rounded-2xl border p-4 ${!ready || url ? "border-[#e1d3ba] bg-white/60" : "border-[#e0b04a] bg-[#fff6dd]"}`}>
      <Avatar src={url} name={nickname} className="size-[4.5rem]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{url ? "Sua foto" : "Adicione uma foto"}</p>
        <p className="mt-0.5 text-xs text-[#6b5440]">{url ? "Aparece no seu mural e na busca." : "Quem abrir o seu mural vai ver você. Fica redonda e é recortada no centro."}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy || !ready} onClick={() => input.current?.click()}>
            {busy ? "Enviando…" : url ? "Alterar foto" : "Escolher foto"}
          </button>
          {url && (
            <button type="button" className={btn} disabled={busy} onClick={remove}>
              Remover
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} aria-label="Escolher foto de perfil" />
        <p className="mt-1.5 text-[11px] text-[#8a7b69]">JPG, PNG ou WebP, até {MAX_AVATAR_MB} MB.</p>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`mt-1.5 text-sm ${msg.ok ? "text-[#2f6b3a]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
